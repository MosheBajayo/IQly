#!/usr/bin/env node
/**
 * export-pdf.js — renders a local write-up HTML file to PDF via headless Chrome/Chromium.
 * Why: BRIEF.md only accepts PDF/DOCX/PPTX/slides for write-ups, not raw HTML; this is the
 * one offline, no-dependency way to turn docs/ HTML sources into each part's writeup.pdf.
 *
 * Usage: node scripts/export-pdf.js <input.html> <output.pdf>
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

async function main() {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg || !outputArg) {
    console.error('Usage: node export-pdf.js <input.html> <output.pdf>');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`HTML file not found: ${inputPath}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome' });
  } catch (e) {
    browser = await chromium.launch();
  }

  try {
    const page = await browser.newPage();
    await page.goto(`file://${inputPath}`, { waitUntil: 'load' });
    await page.pdf({ path: outputPath, format: 'Letter', printBackground: true });
    console.log(`Exported ${path.relative(process.cwd(), outputPath)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('export-pdf.js failed:', err);
  process.exit(1);
});
