// Prints rendered boxes of Home header/hero elements next to the Figma coordinates (1920 wide).
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://localhost:3000/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: "*,*::before,*::after{animation:none!important;transition:none!important}",
});
const rows = [
  // label, selector (CSS) or text, expected [x, y, w, h] (null = ignore)
  ["bar text", "text=Complimentary shipping", [778, 14, null, null]],
  ["bar left", "text=Limited edition studio release", [45, 14, null, null]],
  ["store text", "text=Store locator", [1643, 14, null, null]],
  ["logo word", "a[aria-label^='Cosmia'] span:first-child", [30, 54, null, null]],
  ["logo tag", "a[aria-label^='Cosmia'] span:nth-child(2)", [30, 87.33, 125, null]],
  [
    "nav Home",
    "nav[aria-label=Primary] > ul > li:nth-child(1) > a > span",
    [null, 68, null, null],
    "right",
    770,
  ],
  [
    "nav Shop",
    "nav[aria-label=Primary] > ul > li:nth-child(2) > a > span",
    [null, 68, null, null],
    "right",
    851,
  ],
  [
    "nav Categories",
    "nav[aria-label=Primary] > ul > li:nth-child(3) > a > span",
    [null, 68, null, null],
    "right",
    983,
  ],
  [
    "nav Pages",
    "nav[aria-label=Primary] > ul > li:nth-child(4) > a > span",
    [null, 66, null, null],
    "right",
    1070,
  ],
  [
    "nav Journal",
    "nav[aria-label=Primary] > ul > li:nth-child(5) > a > span",
    [null, 66, null, null],
    "right",
    1178,
  ],
  ["search", "[data-testid=search-trigger]", [1513, 54, 260, 40]],
  ["hero eyebrow", "section[aria-label='Featured collection'] p", [300, 210, null, null]],
  ["hero title", "h1", [300, 250, 446, null]],
  ["hero card", "aside", [1188, 516, 432, 265]],
  ["card h2", "aside h2", [1218, 551, null, null]],
  ["card p", "aside p", [1218, 598, 372, null]],
  ["cta", "aside a", [1218, 694, null, null]],
  ["prev", "button[aria-label='Previous slide']", [300, 741, 40, 40]],
  ["next", "button[aria-label='Next slide']", [355, 741, 40, 40]],
  [
    "idx 01",
    "ol[aria-label=Slides] li:nth-child(1) button",
    [null, 405, null, null],
    "right",
    1890,
  ],
  [
    "idx 02",
    "ol[aria-label=Slides] li:nth-child(2) button",
    [null, 455, null, null],
    "right",
    1890,
  ],
  [
    "idx 03",
    "ol[aria-label=Slides] li:nth-child(3) button",
    [null, 505, null, null],
    "right",
    1890,
  ],
  ["badge", "section[aria-label='Featured collection'] > div[class*=badge]", [1010, 411, 130, 130]],
];
for (const [label, sel, exp, edge, edgeVal] of rows) {
  const loc = page.locator(sel).first();
  const b = await loc.boundingBox().catch(() => null);
  if (!b) {
    console.log(label.padEnd(16), "NOT FOUND");
    continue;
  }
  const got = { x: b.x, y: b.y, w: b.width, h: b.height };
  const parts = [];
  const cmp = (n, g, e) =>
    e == null ? null : `${n} ${g.toFixed(1)}/${e}${Math.abs(g - e) > 0.6 ? " <<<" : ""}`;
  if (edge === "right") parts.push(cmp("right", got.x + got.w, edgeVal));
  else parts.push(cmp("x", got.x, exp[0]));
  parts.push(cmp("y", got.y, exp[1]), cmp("w", got.w, exp[2]), cmp("h", got.h, exp[3]));
  console.log(label.padEnd(16), parts.filter(Boolean).join("  "));
}
await browser.close();
