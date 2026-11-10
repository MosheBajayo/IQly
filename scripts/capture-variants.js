#!/usr/bin/env node
/**
 * capture-variants.js — drives the control and each Part 2 variant to the exact screen
 * state the Part 2 write-up needs (timer running, timer timed out, exit sheet open, the
 * gate screen) and saves real screenshots to docs/assets/part2/. Why: the write-up's
 * control-vs-variant comparisons must show the actual product, never a mockup; this is
 * the one script that reliably reproduces each of those states for export-pdf.js to embed.
 *
 * Usage: node scripts/capture-variants.js
 * Output: docs/assets/part2/*.png (390x844 viewport, deviceScaleFactor 2 for print).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT_DIR = path.resolve(__dirname, '..', 'docs/assets/part2');
const VIEWPORT = { width: 390, height: 844 };
const DEVICE_SCALE_FACTOR = 2;

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (e) {
    return await chromium.launch();
  }
}

async function waitForStepChange(page, previousValue, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = page.locator('[data-qa-step]').first();
    const current = (await el.count()) > 0 ? await el.getAttribute('data-qa-step') : null;
    if (current !== previousValue) return;
    await page.waitForTimeout(30);
  }
}

async function goToQ1(page, htmlPath) {
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.locator('[data-qa="start"]').first().click();
  await page.waitForTimeout(300);
}

async function answerThroughToGate(page) {
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const stepEl = page.locator('[data-qa-step]').first();
    const stepBefore = (await stepEl.count()) > 0 ? await stepEl.getAttribute('data-qa-step') : null;
    const answerLocator = page.locator('[data-qa="answer"]').first();
    if (!(await answerLocator.isVisible().catch(() => false))) break;
    await answerLocator.click();
    // Move the mouse off-screen after every click: Playwright leaves the real cursor
    // at the clicked element's last coordinates, which can land on a differently-sized
    // next screen's button and trigger an unintended :hover state in the screenshot
    // (seen on the gate's Google button — a capture artifact, not an app bug).
    await page.mouse.move(2, 2);
    await page.waitForTimeout(260);
    if (stepBefore !== null) await waitForStepChange(page, stepBefore);
    if ((await page.locator('[data-qa="email"]').count()) > 0) break;
  }
  await page.waitForTimeout(2900); // past ANALYZING_DURATION_MS
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`Captured ${name}.png`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const root = path.resolve(__dirname, '..');
  const control = path.join(root, 'deliverables/part1/index.html');
  const variant1 = path.join(root, 'deliverables/part2/variant-1-question-timer.html');
  const variant2 = path.join(root, 'deliverables/part2/variant-2-exit-sheet.html');
  const variant3 = path.join(root, 'deliverables/part2/variant-3-score-free-report-gated.html');

  const browser = await launchBrowser();

  // Shared control baseline: Q1 with no timer, no exit button — reused for both Test 1
  // and Test 2's "before" comparison, since control's Q1 screen is identical either way.
  {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    await goToQ1(page, control);
    await shot(page, 'control-quiz-q1');
    await context.close();
  }

  // Test 1 — question timer: capture mid-countdown, then after Q1's real timeout.
  {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    await goToQ1(page, variant1);
    await page.waitForTimeout(1500);
    await shot(page, 'test1-variant-timer-running');
    await page.waitForTimeout(11000); // mx-001's timeBudgetMs is 12000ms total
    await shot(page, 'test1-variant-best-guess');
    await context.close();
  }

  // Test 2 — exit sheet: open it via the quiz's exit button.
  {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    await goToQ1(page, variant2);
    await page.locator('#quiz-exit-btn').click();
    await page.waitForTimeout(300);
    await shot(page, 'test2-variant-exit-sheet');
    await context.close();
  }

  // Test 3 — gate screen: control (blurred IQ) vs variant (unblurred IQ).
  {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    await goToQ1(page, control);
    await answerThroughToGate(page);
    await shot(page, 'test3-control-gate');
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    await goToQ1(page, variant3);
    await answerThroughToGate(page);
    await shot(page, 'test3-variant-gate');
    await context.close();
  }

  await browser.close();
  console.log(`All screenshots saved to ${path.relative(root, OUT_DIR)}/`);
}

main().catch((err) => {
  console.error('capture-variants.js failed:', err);
  process.exit(1);
});
