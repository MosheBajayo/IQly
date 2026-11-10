#!/usr/bin/env node
/**
 * render-creatives.js — exports src/creatives/*.html to PNGs at their exact pixel sizes.
 * Why: the Part 3 brief requires exact 320x50 / 250x250 / 1080x1920 files; rendering from
 * the HTML sources with a fixed viewport and deviceScaleFactor 1 guarantees the dimensions.
 *
 * Usage: node scripts/render-creatives.js [--out <dir>]   (default: deliverables/part3)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : path.join(ROOT, 'deliverables/part3');
const SIZES = [[320, 50], [250, 250], [1080, 1920]];

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); } catch (e) { browser = await chromium.launch(); }
  fs.mkdirSync(OUT, { recursive: true });
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(ROOT, 'src/creatives', `${w}x${h}.html`));
    await page.screenshot({ path: path.join(OUT, `iqly-${w}x${h}.png`), clip: { x: 0, y: 0, width: w, height: h } });
    await page.close();
    console.log(`rendered iqly-${w}x${h}.png`);
  }
  await browser.close();
})();
