#!/usr/bin/env node
/**
 * render.js — renders an HTML creative to a PNG at an exact pixel size.
 * Why: Part 3 creatives must be exported at exact 320x50 / 250x250 / 1080x1920
 * dimensions; this uses Playwright with a fixed viewport and deviceScaleFactor 1,
 * then asserts the resulting PNG matches the requested size exactly.
 *
 * Usage: node render.js <html-file> <width> <height> <output-png>
 * Exit code: 0 on success (file written, dimensions match), 1 on any failure.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.slice(0, 8).equals(pngSignature)) {
    throw new Error('Output file is not a valid PNG (bad signature).');
  }
  // IHDR chunk: bytes 8-11 length, 12-15 "IHDR", 16-19 width, 20-23 height (big-endian).
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (e) {
    return await chromium.launch();
  }
}

async function main() {
  const [, , htmlFile, widthArg, heightArg, outputFile] = process.argv;

  if (!htmlFile || !widthArg || !heightArg || !outputFile) {
    console.error('Usage: node render.js <html-file> <width> <height> <output-png>');
    process.exit(1);
  }

  const width = parseInt(widthArg, 10);
  const height = parseInt(heightArg, 10);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    console.error('Width and height must be positive integers.');
    process.exit(1);
  }

  const resolvedHtml = path.resolve(htmlFile);
  if (!fs.existsSync(resolvedHtml)) {
    console.error(`HTML file not found: ${resolvedHtml}`);
    process.exit(1);
  }

  const resolvedOutput = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const requests = [];
    page.on('request', (req) => requests.push(req.url()));

    await page.goto(`file://${resolvedHtml}`, { waitUntil: 'load' });
    await page.screenshot({ path: resolvedOutput });
    await context.close();

    const external = requests.filter((u) => !u.startsWith('file://') && !u.startsWith('about:'));
    if (external.length > 0) {
      console.warn(`WARNING: ${external.length} non-file:// request(s) detected:`);
      external.forEach((u) => console.warn(`  - ${u}`));
    }

    const { width: outW, height: outH } = readPngDimensions(resolvedOutput);
    console.log(`Rendered ${resolvedOutput}: ${outW}x${outH} (requested ${width}x${height})`);

    if (outW !== width || outH !== height) {
      console.error(`FAIL — dimension mismatch: expected ${width}x${height}, got ${outW}x${outH}`);
      process.exit(1);
    }

    console.log('PASS — dimensions match exactly.');
    process.exit(0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('render.js failed:', err.message);
  process.exit(1);
});
