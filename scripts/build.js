#!/usr/bin/env node
/**
 * build.js — inlines src/index.html + styles.css + config.js + app.js + items/bank.json
 * into a single standalone HTML file (zero external requests, no build step to open it).
 * Why: CLAUDE.md requires every deliverable to run offline from one file; this is the one
 * place that assembly happens, so every Part 1/2 output comes from the same engine.
 *
 * Usage: node scripts/build.js [--out <path>] [--set FLAG=value ...]
 * Example: node scripts/build.js --out deliverables/part2/variant-1-x.html --set GATE_MODE=all_locked
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function parseArgs(argv) {
  const opts = { out: path.join(ROOT, 'deliverables', 'part1', 'index.html'), overrides: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      opts.out = path.resolve(ROOT, argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--set') {
      const pair = argv[i + 1];
      const eq = pair.indexOf('=');
      if (eq === -1) throw new Error(`--set expects FLAG=value, got "${pair}"`);
      opts.overrides.push({ flag: pair.slice(0, eq), value: pair.slice(eq + 1) });
      i += 1;
    }
  }
  return opts;
}

function literalFor(value) {
  if (value === 'true' || value === 'false') return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return `'${value.replace(/'/g, "\\'")}'`;
}

function applyOverrides(configSrc, overrides) {
  let appliedFlags = new Set();
  const lines = configSrc.split('\n').map((line) => {
    const trimmed = line.trim();
    for (const { flag, value } of overrides) {
      if (trimmed.startsWith(`${flag}:`)) {
        appliedFlags.add(flag);
        const indent = line.slice(0, line.length - line.trimStart().length);
        return `${indent}${flag}: ${literalFor(value)},`;
      }
    }
    return line;
  });
  overrides.forEach(({ flag }) => {
    if (!appliedFlags.has(flag)) {
      throw new Error(`Unknown config flag in --set: "${flag}" (check src/config.js)`);
    }
  });
  return lines.join('\n');
}

function build(opts) {
  const htmlSrc = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  let configSrc = fs.readFileSync(path.join(SRC, 'config.js'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
  const bank = JSON.parse(fs.readFileSync(path.join(SRC, 'items', 'bank.json'), 'utf8'));

  if (opts.overrides.length) {
    configSrc = applyOverrides(configSrc, opts.overrides);
  }

  let html = htmlSrc;
  html = html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    `<style>\n${cssSrc}\n</style>`
  );
  html = html.replace(
    '<script src="config.js"></script>',
    `<script>\n${configSrc}\n</script>`
  );
  html = html.replace(
    '<script src="app.js"></script>',
    `<script>\nwindow.IQLY_BANK = ${JSON.stringify(bank)};\n${appSrc}\n</script>`
  );

  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, html, 'utf8');

  console.log(`Built ${path.relative(ROOT, opts.out)} (${bank.length} items in bank).`);
  if (opts.overrides.length) {
    console.log('Overrides applied:', opts.overrides.map((o) => `${o.flag}=${o.value}`).join(', '));
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  build(opts);
}

main();
