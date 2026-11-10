#!/usr/bin/env node
/**
 * package.js — builds the clean submission zip at dist/IQly-submission.zip.
 * Why: the project folder holds working files (QA screenshots, node_modules, design-tool
 * exports, OS and session files) that are not part of the submission; this script includes
 * only what a reviewer needs, so the zip is reproducible and never ships clutter.
 *
 * Usage: node scripts/package.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'IQly-submission.zip');
const INCLUDE = ['README.md', 'BRIEF.md', 'CLAUDE.md', 'ai-log.md', 'deliverables', 'src', 'docs', 'scripts', 'ai-toolkit', '.claude/skills', '.claude/agents'];
const EXCLUDE = ['*.DS_Store', '*/node_modules/*', '*scheduled_tasks.lock', '*/qa/*'];

fs.mkdirSync(DIST, { recursive: true });
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
const present = INCLUDE.filter((p) => fs.existsSync(path.join(ROOT, p)));
execFileSync('zip', ['-r', '-q', OUT, ...present, '-x', ...EXCLUDE], { cwd: ROOT });
console.log('Wrote ' + path.relative(ROOT, OUT) + ' (' + (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB)');
