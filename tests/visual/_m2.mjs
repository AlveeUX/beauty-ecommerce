import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: "*,*::before,*::after{animation:none!important;transition:none!important}",
});
const rows = [
  ["fav eyebrow", "text=Find your glow", [300, 981]],
  ["fav title", "h2:has-text('Find favorites')", [300, 1021]],
  ["fav button", "a:has-text('More categories')", [null, 1007]],
  ["card1", "a[href='/shop?category=skincare']", [300, 1109, 308, 420]],
  ["card2", "a[href='/shop?category=eyes']", [637, 1109, 308, 420]],
  ["card3", "a[href='/shop?category=lips']", [975, 1109]],
  ["card4", "a[href='/shop?category=face']", [1312, 1109]],
  ["card1 title", "a[href='/shop?category=skincare'] strong", [335, 1454]],
  ["card1 desc", "a[href='/shop?category=skincare'] span >> nth=-1", [335, 1482.4]],
  ["marquee", "[aria-label='Our promises']", [0, 1629, 1920, 82]],
];
for (const [label, sel, exp] of rows) {
  const b = await page
    .locator(sel)
    .first()
    .boundingBox()
    .catch(() => null);
  if (!b) {
    console.log(label.padEnd(14), "NOT FOUND");
    continue;
  }
  const g = [b.x, b.y, b.width, b.height];
  console.log(
    label.padEnd(14),
    g.map((v) => v.toFixed(1)).join(" "),
    " exp",
    exp.join(" "),
    exp.some((e, i) => e != null && Math.abs(g[i] - e) > 0.7) ? "<<<" : "",
  );
}
// marquee item geometry
const items = await page.evaluate(() =>
  [...document.querySelectorAll("[aria-label='Our promises'] li")].slice(0, 6).map((li) => {
    const s = li.querySelector("svg").getBoundingClientRect();
    const t = li.querySelector("span").getBoundingClientRect();
    return [
      s.x.toFixed(1),
      s.y.toFixed(1),
      t.x.toFixed(1),
      t.y.toFixed(1),
      t.width.toFixed(1),
    ].join(" ");
  }),
);
console.log("marquee svg.x svg.y text.x text.y text.w\n" + items.join("\n"));
await browser.close();
