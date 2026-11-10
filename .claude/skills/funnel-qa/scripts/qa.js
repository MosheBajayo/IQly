#!/usr/bin/env node
/**
 * qa.js — drives the quiz flow end to end on mobile and desktop and checks the
 * CLAUDE.md Definition of Done: zero external network requests, no console errors,
 * no horizontal scroll on mobile, tap targets >= 48px on mobile.
 *
 * Why: manual click-through QA is slow and inconsistent across variants; this
 * automates it against the flow's data-qa contract (see SKILL.md) so every variant
 * gets the same objective check before being marked done.
 *
 * Usage: node qa.js <path-to-html>
 * Output: qa/<file-name>/<device>/NN-<step>.png, qa/<file-name>/report.md
 * Exit code: 0 if every check passes on every device, 1 otherwise.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST_EMAIL = 'test@example.com';
const MIN_TAP_TARGET = 48;
const MAX_STEPS = 50;

const MOBILE_CONTEXT = {
  viewport: { width: 390, height: 664 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const DESKTOP_CONTEXT = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
};

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (e) {
    return await chromium.launch();
  }
}

async function captureStep(page, device, outDir, counter, label, mobileChecks) {
  const fileName = `${String(counter.value).padStart(2, '0')}-${label}.png`;
  counter.value += 1;
  await page.screenshot({ path: path.join(outDir, fileName) });

  if (device === 'mobile') {
    const scroll = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (scroll.scrollWidth > scroll.clientWidth + 1) {
      mobileChecks.horizontalScrollIssues.push(
        `${label}: scrollWidth ${scroll.scrollWidth}px > clientWidth ${scroll.clientWidth}px`
      );
    }

    const targets = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-qa]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return {
            qa: el.getAttribute('data-qa'),
            width: r.width,
            height: r.height,
            visible: style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0,
          };
        })
        .filter((t) => t.visible);
    });
    targets.forEach((t) => {
      if (t.width < MIN_TAP_TARGET || t.height < MIN_TAP_TARGET) {
        mobileChecks.tapTargetIssues.push(
          `${label}: [data-qa="${t.qa}"] is ${Math.round(t.width)}x${Math.round(t.height)}px (needs >= ${MIN_TAP_TARGET}x${MIN_TAP_TARGET})`
        );
      }
    });
  }

  return fileName;
}

async function clickFirstVisible(page, selector) {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const el = locator.nth(i);
    if (await el.isVisible()) {
      await el.click();
      return true;
    }
  }
  return false;
}

// data-qa-step on the quiz/hero-question root holds the current question index as a
// string; it changes (or the element disappears entirely once the quiz hands off to the
// gate) every time the flow actually advances. Waiting for that change — instead of
// re-clicking [data-qa="answer"] blindly — is what replaces the old repeated-click /
// MAX_STEPS-starvation behavior documented in ai-log.md (2026-11-06, "Part 1 flow built").
async function getStepValue(page) {
  const el = page.locator('[data-qa-step]').first();
  if ((await el.count()) === 0) return null;
  return await el.getAttribute('data-qa-step');
}

async function waitForStepChange(page, previousValue, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await getStepValue(page);
    if (current !== previousValue) return current;
    await page.waitForTimeout(30);
  }
  return getStepValue(page);
}

// TIMER_MODE=per_question only: waits for Q1's real countdown (against its own
// timeBudgetMs) to reach zero and confirms the "best guess" banner appears, then lets
// the normal immediate-answer loop below continue. Detected via data-timer-root /
// data-timeout-banner — deliberately NOT named data-qa-* so these diagnostic-only,
// non-interactive elements are excluded from the tap-target scan (see SKILL.md).
async function checkQuestionTimeout(page) {
  const hasTimer = (await page.locator('[data-timer-root]').count()) > 0;
  if (!hasTimer) return null;

  const start = Date.now();
  let appeared = false;
  while (Date.now() - start < 35000) {
    appeared = await page.locator('[data-timeout-banner]').first().isVisible().catch(() => false);
    if (appeared) break;
    await page.waitForTimeout(200);
  }
  return appeared;
}

async function runFlow(page, device, outDir, mobileChecks) {
  const counter = { value: 1 };
  const steps = [];
  let timerCheck = null;

  steps.push(await captureStep(page, device, outDir, counter, 'landing', mobileChecks));

  if (await clickFirstVisible(page, '[data-qa="start"]')) {
    steps.push(await captureStep(page, device, outDir, counter, 'after-start', mobileChecks));
  }

  timerCheck = await checkQuestionTimeout(page);
  if (timerCheck !== null) {
    steps.push(await captureStep(page, device, outDir, counter, 'question-1-timeout', mobileChecks));
  }

  let guard = 0;
  while (guard < MAX_STEPS) {
    guard += 1;
    const stepBefore = await getStepValue(page);
    const answered = await clickFirstVisible(page, '[data-qa="answer"]');
    if (!answered) break;

    await clickFirstVisible(page, '[data-qa="next"]');
    if (stepBefore !== null) {
      await waitForStepChange(page, stepBefore);
    }
    steps.push(await captureStep(page, device, outDir, counter, `question-${guard}`, mobileChecks));

    const emailLocator = page.locator('[data-qa="email"]');
    if ((await emailLocator.count()) > 0 && (await emailLocator.first().isVisible())) {
      break;
    }
  }

  const emailLocator = page.locator('[data-qa="email"]');
  if ((await emailLocator.count()) > 0) {
    await emailLocator.first().fill(TEST_EMAIL);
    steps.push(await captureStep(page, device, outDir, counter, 'email-filled', mobileChecks));
  }

  if (await clickFirstVisible(page, '[data-qa="submit"]')) {
    // 700ms comfortably clears the results screen's IQ count-up animation (~450ms,
    // see src/app.js animateCountUp) so this screenshot never catches the hero number
    // mid-animation while the score card below it already shows the final value —
    // a real mismatch-looking artifact a persona review caught in this evidence.
    await page.waitForTimeout(700);
    steps.push(await captureStep(page, device, outDir, counter, 'result', mobileChecks));
  }

  return { steps, timerCheck };
}

// Google signup is a prototype-only path (no real OAuth is possible from a zero-
// backend static file) that must still reach the real results screen with its demo
// disclosure visible. Runs the quiz fresh in its own context — separate from the main
// email-path runFlow, which stays the one funnel-qa drives by default — since
// #google-signup-btn is deliberately not data-qa="submit".
async function checkGoogleSignup(resolvedHtml, contextOptions) {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await page.goto(`file://${resolvedHtml}`, { waitUntil: 'load' });

    await clickFirstVisible(page, '[data-qa="start"]');
    let guard = 0;
    while (guard < MAX_STEPS) {
      guard += 1;
      const stepBefore = await getStepValue(page);
      const answered = await clickFirstVisible(page, '[data-qa="answer"]');
      if (!answered) break;
      if (stepBefore !== null) await waitForStepChange(page, stepBefore);
      const emailLocator = page.locator('[data-qa="email"]');
      if ((await emailLocator.count()) > 0 && (await emailLocator.first().isVisible())) break;
    }

    const googleBtn = page.locator('#google-signup-btn');
    if ((await googleBtn.count()) === 0) return null; // no gate reached — treat as N/A upstream

    await googleBtn.first().click();
    const start = Date.now();
    let stripText = '';
    while (Date.now() - start < 5000) {
      stripText = await page.locator('.account-strip').first().textContent().catch(() => '');
      if (stripText && /google/i.test(stripText)) break;
      await page.waitForTimeout(100);
    }
    await context.close();
    return /google/i.test(stripText || '');
  } finally {
    await browser.close();
  }
}

async function runDevice(resolvedHtml, deviceName, contextOptions, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launchBrowser();
  const requests = [];
  const consoleErrors = [];
  const mobileChecks = { horizontalScrollIssues: [], tapTargetIssues: [] };

  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    page.on('request', (req) => requests.push(req.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`file://${resolvedHtml}`, { waitUntil: 'load' });
    const { steps, timerCheck } = await runFlow(page, deviceName, outDir, mobileChecks);

    await context.close();

    const externalRequests = requests.filter(
      (u) => !u.startsWith('file://') && u !== 'about:blank'
    );

    const googleCheck = await checkGoogleSignup(resolvedHtml, contextOptions);

    return { steps, externalRequests, consoleErrors, mobileChecks, timerCheck, googleCheck };
  } finally {
    await browser.close();
  }
}

function buildReport(fileName, results) {
  const { mobile, desktop } = results;

  const networkOk = mobile.externalRequests.length === 0 && desktop.externalRequests.length === 0;
  const consoleOk = mobile.consoleErrors.length === 0 && desktop.consoleErrors.length === 0;
  const scrollOk = mobile.mobileChecks.horizontalScrollIssues.length === 0;
  const tapOk = mobile.mobileChecks.tapTargetIssues.length === 0;
  // null = no timer detected on that device (not applicable, not a failure); true/false
  // = the timeout banner did/didn't appear within 35s of Q1's countdown starting.
  const timerOk = mobile.timerCheck !== false && desktop.timerCheck !== false;
  // null = no google-signup button found (gate never reached — a real failure, not N/A,
  // since every gate build now ships this button); true/false = whether the results
  // screen's account strip confirmed Google signup within 5s of the click.
  const googleOk = mobile.googleCheck === true && desktop.googleCheck === true;

  const row = (label, mobilePass, desktopPass) =>
    `| ${label} | ${mobilePass} | ${desktopPass} |`;

  const pf = (n) => (n === 0 ? 'PASS' : `FAIL (${n} issue(s))`);
  const tf = (v) => (v === null ? 'N/A' : v ? 'PASS' : 'FAIL (timeout banner never appeared)');
  const gf = (v) => (v === true ? 'PASS' : v === null ? 'FAIL (gate never reached)' : 'FAIL (no Google confirmation on results)');

  const lines = [];
  lines.push(`# Funnel QA Report — ${fileName}`);
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('| Check | Mobile | Desktop |');
  lines.push('|---|---|---|');
  lines.push(
    row(
      'Zero external network requests',
      pf(mobile.externalRequests.length),
      pf(desktop.externalRequests.length)
    )
  );
  lines.push(row('No console errors', pf(mobile.consoleErrors.length), pf(desktop.consoleErrors.length)));
  lines.push(row('No horizontal scroll', pf(mobile.mobileChecks.horizontalScrollIssues.length), 'N/A'));
  lines.push(row('Tap targets >= 48px', pf(mobile.mobileChecks.tapTargetIssues.length), 'N/A'));
  lines.push(row('Q1 timeout reaches "best guess" (TIMER_MODE=per_question only)', tf(mobile.timerCheck), tf(desktop.timerCheck)));
  lines.push(row('Continue with Google reaches results + demo strip', gf(mobile.googleCheck), gf(desktop.googleCheck)));
  lines.push('');
  lines.push('## Steps captured');
  lines.push('### Mobile');
  mobile.steps.forEach((s) => lines.push(`- ${s}`));
  lines.push('### Desktop');
  desktop.steps.forEach((s) => lines.push(`- ${s}`));
  lines.push('');

  const issues = [];
  mobile.externalRequests.forEach((u) => issues.push(`[mobile] external request: ${u}`));
  desktop.externalRequests.forEach((u) => issues.push(`[desktop] external request: ${u}`));
  mobile.consoleErrors.forEach((e) => issues.push(`[mobile] console error: ${e}`));
  desktop.consoleErrors.forEach((e) => issues.push(`[desktop] console error: ${e}`));
  mobile.mobileChecks.horizontalScrollIssues.forEach((i) => issues.push(`[mobile] ${i}`));
  mobile.mobileChecks.tapTargetIssues.forEach((i) => issues.push(`[mobile] ${i}`));
  if (mobile.timerCheck === false) issues.push('[mobile] Q1 timeout banner never appeared within 35s');
  if (desktop.timerCheck === false) issues.push('[desktop] Q1 timeout banner never appeared within 35s');
  if (mobile.googleCheck !== true) issues.push('[mobile] Continue with Google did not reach results with a Google confirmation');
  if (desktop.googleCheck !== true) issues.push('[desktop] Continue with Google did not reach results with a Google confirmation');

  lines.push('## Issues');
  if (issues.length === 0) {
    lines.push('- None.');
  } else {
    issues.forEach((i) => lines.push(`- ${i}`));
  }

  const overallPass = networkOk && consoleOk && scrollOk && tapOk && timerOk && googleOk;
  lines.push('');
  lines.push(`## Overall result: ${overallPass ? 'PASS' : 'FAIL'}`);

  return { reportText: lines.join('\n') + '\n', overallPass };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node qa.js <path-to-html>');
    process.exit(1);
  }

  const resolvedHtml = path.resolve(inputPath);
  if (!fs.existsSync(resolvedHtml)) {
    console.error(`HTML file not found: ${resolvedHtml}`);
    process.exit(1);
  }

  const baseName = path.basename(resolvedHtml, path.extname(resolvedHtml));
  const qaRoot = path.resolve(process.cwd(), 'qa', baseName);
  const mobileDir = path.join(qaRoot, 'mobile');
  const desktopDir = path.join(qaRoot, 'desktop');

  console.log(`Running funnel QA on ${resolvedHtml}`);
  const mobile = await runDevice(resolvedHtml, 'mobile', MOBILE_CONTEXT, mobileDir);
  const desktop = await runDevice(resolvedHtml, 'desktop', DESKTOP_CONTEXT, desktopDir);

  const { reportText, overallPass } = buildReport(baseName, { mobile, desktop });
  const reportPath = path.join(qaRoot, 'report.md');
  fs.writeFileSync(reportPath, reportText, 'utf8');

  console.log(reportText);
  console.log(`Report written to ${reportPath}`);

  process.exit(overallPass ? 0 : 1);
}

main().catch((err) => {
  console.error('qa.js failed:', err);
  process.exit(1);
});
