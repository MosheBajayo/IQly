#!/usr/bin/env node
/**
 * capture-part1-shots.js — captures the 5 funnel-strip screenshots used in the Part 1 write-up
 * (landing, quiz question, analyzing overlay, gate, results) from deliverables/part1/index.html.
 * Why: the write-up must show the real current build, never mockups; a script makes the
 * images reproducible after any flow change. 390px wide, deviceScaleFactor 2, top of screen only.
 *
 * Usage: node scripts/capture-part1-shots.js
 * Output: docs/assets/part1/01-landing.png ... 05-results.png
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/assets/part1');
const FILE = 'file://' + path.join(ROOT, 'deliverables/part1/index.html');
const CLIP_H = 520;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); } catch (e) { browser = await chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const shot = async (name) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150); return page.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: 390, height: CLIP_H } }); };

  await page.goto(FILE);
  await page.waitForSelector('[data-qa=start]');
  await page.waitForTimeout(400);
  await shot('01-landing.png');
  await page.click('[data-qa=start]');
  await page.waitForSelector('[data-qa=answer]');
  await page.waitForTimeout(500);
  await shot('02-quiz.png');
  for (let i = 0; i < 12; i++) {
    await page.waitForSelector('[data-qa=answer]');
    await page.locator('[data-qa=answer]').first().click();
    await page.waitForTimeout(i === 11 ? 700 : 450);
  }
  await page.waitForSelector('#analyzing-overlay');
  await page.waitForTimeout(900);
  await shot('03-analyzing.png');
  await page.waitForTimeout(2600);
  await shot('04-gate.png');
  await page.fill('[data-qa=email]', 'you@example.com');
  await page.click('[data-qa=submit]');
  await page.waitForSelector('#share-pill');
  await page.waitForTimeout(3000);
  await shot('05-results.png');
  await browser.close();
  console.log('Captured 5 screens to docs/assets/part1/');
})();
