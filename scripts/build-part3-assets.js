#!/usr/bin/env node
/**
 * build-part3-assets.js — builds the Part 3 presentation assets (contact sheet,
 * in-context previews, continuity strip) by laying out the real exported creative PNGs
 * and the real landing screenshot in plain HTML, then screenshotting each layout. Why:
 * the write-up must show real creative images in context, never mockup placeholders
 * drawn from scratch, and a script makes the layouts reproducible after any creative
 * or landing change.
 *
 * Usage: node scripts/build-part3-assets.js
 * Output: docs/assets/part3/*.png, deliverables/part3/iqly-contact-sheet.png
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT_DOCS = path.join(ROOT, 'docs/assets/part3');
const CREATIVE_320 = path.join(ROOT, 'deliverables/part3/iqly-320x50.png');
const CREATIVE_250 = path.join(ROOT, 'deliverables/part3/iqly-250x250.png');
const CREATIVE_1080 = path.join(ROOT, 'deliverables/part3/iqly-1080x1920.png');
const LANDING_MOBILE = path.join(ROOT, 'ai-toolkit/iterations/part3-v1-to-v2/after/landing-mobile.png');

function fileUrl(p) {
  return 'file://' + p;
}

// page.setContent() loads on about:blank, and Chromium blocks file:// subresource
// loads from a document that isn't itself file:// — so each layout is written to a
// temp .html file and navigated to directly, giving the document a file:// origin.
async function shotHtml(browser, html, outPath, viewport) {
  const tmpHtml = outPath + '.tmp.html';
  fs.writeFileSync(tmpHtml, html);
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(fileUrl(tmpHtml), { waitUntil: 'load' });
    await page.waitForTimeout(150);
    await page.screenshot({ path: outPath });
    await context.close();
  } finally {
    fs.unlinkSync(tmpHtml);
  }
}

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const LABEL_STYLE = `font-family:${FONT};font-size:13px;font-weight:700;color:#5D5775;text-align:center;margin-top:8px;`;

async function buildContactSheet(browser) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#FBFAFF;font-family:${FONT};}
    .sheet{display:flex;align-items:flex-end;gap:48px;padding:40px;}
    .item{display:flex;flex-direction:column;align-items:center;}
    img{display:block;border:1px solid #E7E3F3;}
    .label{${LABEL_STYLE}}
  </style></head><body>
    <div class="sheet">
      <div class="item"><img src="${fileUrl(CREATIVE_1080)}" width="1080" height="1920"><span class="label">1080 &times; 1920</span></div>
      <div class="item"><img src="${fileUrl(CREATIVE_250)}" width="250" height="250"><span class="label">250 &times; 250</span></div>
      <div class="item"><img src="${fileUrl(CREATIVE_320)}" width="320" height="50"><span class="label">320 &times; 50</span></div>
    </div>
  </body></html>`;
  await shotHtml(browser, html, path.join(OUT_DOCS, 'contact-sheet.png'), { width: 1900, height: 2030 });
  fs.copyFileSync(path.join(OUT_DOCS, 'contact-sheet.png'), path.join(ROOT, 'deliverables/part3/iqly-contact-sheet.png'));
}

async function buildInContext320(browser) {
  // Generic, unbranded app screen with the 320x50 banner anchored at the bottom.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#E7E3F3;font-family:${FONT};display:flex;align-items:center;justify-content:center;height:100vh;}
    .phone{width:360px;height:720px;background:#fff;border:10px solid #1B1530;border-radius:40px;overflow:hidden;position:relative;box-shadow:0 20px 40px rgba(0,0,0,0.25);}
    .statusbar{height:28px;background:#F2F2F5;}
    .content{padding:16px;display:flex;flex-direction:column;gap:10px;}
    .block{height:18px;background:#E3E3EA;border-radius:4px;}
    .block.w60{width:60%} .block.w80{width:80%} .block.w40{width:40%}
    .card{height:120px;background:#EDEDF2;border-radius:10px;margin-top:6px;}
    .adslot{position:absolute;bottom:0;left:0;right:0;height:50px;display:flex;align-items:center;justify-content:center;background:#fff;border-top:1px solid #ddd;}
  </style></head><body>
    <div class="phone">
      <div class="statusbar"></div>
      <div class="content">
        <div class="block w60"></div>
        <div class="block w80"></div>
        <div class="card"></div>
        <div class="block w40"></div>
        <div class="block w80"></div>
        <div class="card"></div>
      </div>
      <div class="adslot"><img src="${fileUrl(CREATIVE_320)}" width="320" height="50"></div>
    </div>
  </body></html>`;
  await shotHtml(browser, html, path.join(OUT_DOCS, 'incontext-320x50.png'), { width: 500, height: 800 });
}

async function buildInContext250(browser) {
  // Generic article page with the 250x250 square in a sidebar.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font-family:${FONT};}
    .page{display:flex;gap:24px;padding:32px;max-width:760px;}
    .article{flex:1;}
    .headline{height:24px;width:90%;background:#E3E3EA;border-radius:4px;margin-bottom:14px;}
    .line{height:12px;background:#EDEDF2;border-radius:4px;margin-bottom:8px;}
    .line.w95{width:95%} .line.w88{width:88%} .line.w70{width:70%} .line.w92{width:92%} .line.w60{width:60%}
    .sidebar{width:270px;display:flex;flex-direction:column;align-items:center;gap:8px;}
    .sidebar-label{font-size:11px;color:#9b96ab;text-transform:uppercase;letter-spacing:0.04em;align-self:flex-start;}
  </style></head><body>
    <div class="page">
      <div class="article">
        <div class="headline"></div>
        <div class="line w95"></div><div class="line w88"></div><div class="line w70"></div>
        <div class="line w92"></div><div class="line w60"></div><div class="line w95"></div>
        <div class="line w88"></div><div class="line w70"></div>
      </div>
      <div class="sidebar">
        <span class="sidebar-label">Advertisement</span>
        <img src="${fileUrl(CREATIVE_250)}" width="250" height="250">
      </div>
    </div>
  </body></html>`;
  await shotHtml(browser, html, path.join(OUT_DOCS, 'incontext-250x250.png'), { width: 760, height: 320 });
}

async function buildInContext1080(browser) {
  // Phone-frame "story" placement, scaled down for display (image itself is full-res).
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#E7E3F3;font-family:${FONT};display:flex;align-items:center;justify-content:center;height:100vh;}
    .phone{width:340px;height:718px;background:#000;border:10px solid #1B1530;border-radius:44px;overflow:hidden;position:relative;box-shadow:0 20px 40px rgba(0,0,0,0.25);}
    .progress{position:absolute;top:10px;left:10px;right:10px;height:3px;background:rgba(255,255,255,0.35);border-radius:2px;z-index:2;}
    .progress-fill{width:38%;height:100%;background:#fff;border-radius:2px;}
    img{width:100%;height:100%;object-fit:cover;display:block;}
  </style></head><body>
    <div class="phone">
      <div class="progress"><div class="progress-fill"></div></div>
      <img src="${fileUrl(CREATIVE_1080)}" width="1080" height="1920">
    </div>
  </body></html>`;
  await shotHtml(browser, html, path.join(OUT_DOCS, 'incontext-1080x1920.png'), { width: 460, height: 800 });
}

async function buildContinuityStrip(browser) {
  const pair = (creativeSrc, w, h, label) => `
    <div class="pair">
      <div class="item"><img src="${fileUrl(creativeSrc)}" width="${w}" height="${h}" style="max-height:180px;width:auto;"><span class="label">${label}</span></div>
      <span class="arrow">&rarr;</span>
      <div class="item"><img src="${fileUrl(LANDING_MOBILE)}" width="390" height="844" style="max-height:220px;width:auto;border-radius:10px;"><span class="label">Landing (updated)</span></div>
    </div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#FBFAFF;font-family:${FONT};}
    .strip{display:flex;gap:40px;padding:30px;align-items:flex-end;}
    .pair{display:flex;align-items:flex-end;gap:16px;border:1px solid #E7E3F3;border-radius:12px;padding:16px;background:#fff;}
    .item{display:flex;flex-direction:column;align-items:center;gap:6px;}
    img{display:block;border:1px solid #E7E3F3;}
    .label{${LABEL_STYLE}}
    .arrow{font-size:28px;color:#5A3FD8;font-weight:800;padding-bottom:30px;}
  </style></head><body>
    <div class="strip">
      ${pair(CREATIVE_320, 320, 50, '320×50 ad')}
      ${pair(CREATIVE_250, 250, 250, '250×250 ad')}
      ${pair(CREATIVE_1080, 1080, 1920, '1080×1920 ad')}
    </div>
  </body></html>`;
  await shotHtml(browser, html, path.join(OUT_DOCS, 'continuity-strip.png'), { width: 1500, height: 320 });
}

async function main() {
  fs.mkdirSync(OUT_DOCS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  try {
    await buildContactSheet(browser);
    await buildInContext320(browser);
    await buildInContext250(browser);
    await buildInContext1080(browser);
    await buildContinuityStrip(browser);
    console.log('Built all Part 3 presentation assets in ' + path.relative(ROOT, OUT_DOCS) + '/');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('build-part3-assets.js failed:', err);
  process.exit(1);
});
