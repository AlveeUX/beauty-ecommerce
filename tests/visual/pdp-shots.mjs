// PDP layout visual helper: captures the top section (gallery + purchase panel) of every Figma layout
// and prints key boxes in page coordinates. Usage: node tests/visual/pdp-shots.mjs <outDir> [baseUrl]
import { chromium } from "@playwright/test";

const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const cases = [
  ["details-default", "the-renewal-serum"],
  ["product-color", "velvet-skin-foundation"],
  ["subscribe-and-save", "the-renewal-serum"],
  ["on-sale-countdown", "barrier-repair-cream"],
  ["thumbnail-right", "the-renewal-serum"],
  ["thumbnail-left", "the-renewal-serum"],
  ["gallery-1-column", "the-renewal-serum"],
  ["gallery-2-column", "the-renewal-serum"],
  ["inner-zoom", "the-renewal-serum"],
  ["external-zoom", "the-renewal-serum"],
];

const box = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [
      Math.round(r.left),
      Math.round(r.top + scrollY),
      Math.round(r.width),
      Math.round(r.height),
    ];
  }, sel);

for (const [layout, slug] of cases) {
  await page.goto(`${base}/product/${slug}?layout=${layout}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
  if (layout.endsWith("zoom")) {
    const m = await box("[data-testid='gallery-main']");
    await page.mouse.move(m[0] + 322, m[1] + 280);
    await page.mouse.move(m[0] + 323, m[1] + 281);
  }
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.waitForTimeout(250);
  const top = await box("section[data-layout]");
  await page.screenshot({
    path: `${out}/pdp-${layout}.png`,
    clip: { x: 280, y: top[1], width: 1360, height: Math.min(top[3], 1300) },
    fullPage: true,
  });
  console.log(
    layout,
    "section",
    top,
    "main",
    await box("[data-testid='gallery-main'], [data-testid='gallery-grid']"),
  );
}
await browser.close();
