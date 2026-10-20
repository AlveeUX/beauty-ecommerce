import { chromium } from "@playwright/test";
// Usage: node tests/visual/overlay-shots.mjs <outDir> [baseUrl]. Screenshots of the four overlays and their boxes.
const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 1920, height: 1000 },
  storageState: {
    cookies: [],
    origins: [
      {
        origin: base,
        localStorage: [
          {
            name: "cosmia.newsletter-popup",
            value: JSON.stringify({ at: 4102444800000, subscribed: false }),
          },
        ],
      },
    ],
  },
});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
const page = await ctx.newPage();
const box = (sel, n = 0) =>
  page.evaluate(
    ([s, i]) => {
      const el = document.querySelectorAll(s)[i];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    },
    [sel, n],
  );
const log = (label, got, want) => console.log(label.padEnd(18), JSON.stringify(got), "figma", want);
const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
};

await page.goto(`${base}/shop`, { waitUntil: "networkidle" });
await page.getByTestId("product-card").first().getByTestId("card-quickview").click({ force: true });
await page.getByTestId("qv-add").waitFor();
await settle();
await page.screenshot({ path: `${out}/quick-view.png` });
const q = "[data-testid='quick-view']";
log("qv box", await box(q), "[410,~180(209),1100,641]");
log("qv close", await box(`${q} button[aria-label='Close']`), "x1475-1495 rel; 20x20");
log("qv status badge", await box(`${q} span[class*='badge']`), "[990-410..] cap 30 from top");
log("qv title", await box(`${q} h2`), "x990 cap-top 290 -> +81");
log("qv desc", await box(`${q} p[class*='description']`), "w443 h64 +143");
log("qv rating", await box(`${q} div[class*='ratingRow']`), "x990 +237");
log("qv price", await box(`${q} [data-testid='qv-price']`), "x990 +289 h23");
log("qv qty", await box(`${q} [data-testid='qv-quantity']`), "[990,+352,131,52]");
log("qv add", await box(`${q} [data-testid='qv-add']`), "[1136,+352,344,52]");
log("qv buy", await box(`${q} [data-testid='qv-buy-now']`), "[991,+419,489,52]");
log("qv more", await box(`${q} a[class*='more']`), "[990,+582,166,18]");
log("qv arrow", await box(`${q} [data-testid='qv-prev']`), "[+15,+301,40,40]");
await page.keyboard.press("Escape");

await page.goto(`${base}/product/the-renewal-serum`, { waitUntil: "networkidle" });
await page.getByTestId("size-guide-link").click();
await page.getByTestId("size-guide").waitFor();
await settle();
await page.screenshot({ path: `${out}/size-guide.png` });
const s = "[data-testid='size-guide']";
log("sg box", await box(s), "[588,~283,744,445]");
log("sg table", await box(`${s} table`), "[618,365,684,287]");
log("sg note", await box(`${s} p`), "x625 cap-top 682");
log("sg title", await box(`${s} h2`), "x618 cap-top 318");
await page.keyboard.press("Escape");

await page.getByTestId("share").click();
await page.getByTestId("share-modal").waitFor();
await settle();
await page.screenshot({ path: `${out}/share.png` });
const h = "[data-testid='share-modal']";
log("share box", await box(h), "[689,268,543,474]");
log("share thumb", await box(`${h} div[class*='thumb']`), "[719,363,88,88]");
log("share name", await box(`${h} p[class*='name']`), "x819 cap-top 373");
log("share circle 0", await box(`${h} span[class*='circle']`, 0), "[754,501,50,50]");
log("share circle 3", await box(`${h} span[class*='circle']`, 3), "[1115,501,50,50]");
log("share url box", await box(`${h} div[class*='link']`), "[719,613,483,53]");
log("share copy", await box(`${h} button[data-testid='share-copy']`), "[1106,619,90,41]");
log("share note", await box(`${h} p[class*='note']`), "x719 cap-top 696");
await page.keyboard.press("Escape");

await page.goto(`${base}/shop`, { waitUntil: "networkidle" });
await page.getByTestId("product-card").nth(0).getByTestId("card-wishlist").click({ force: true });
await page.getByRole("button", { name: "Continue shopping" }).click();
await page.getByTestId("product-card").nth(1).getByTestId("card-wishlist").click({ force: true });
await page.getByTestId("wishlist-modal").waitFor();
await settle();
await page.screenshot({ path: `${out}/wishlist.png` });
const w = "[data-testid='wishlist-modal']";
log("wish box", await box(w), "[688,~252,543,486]");
log("wish thumb", await box(`${w} a[class*='thumb']`), "[745,352,90,104]");
log("wish name", await box(`${w} p[class*='rowName']`), "x845 cap-top 352");
log("wish price", await box(`${w} p[class*='rowPrice']`), "x845 cap-top 380");
log("wish stock", await box(`${w} p[class*='stock']`), "x845 cap-top 444");
log("wish add 0", await box(`${w} button[class*='rowAdd']`), "[1080,415,121,41]");
log("wish row 1 thumb", await box(`${w} a[class*='thumb']`, 1), "[745,496,90,104]");
log("wish foot", await box(`${w} footer`), "[689,631,542,112]");
log("wish view", await box(`${w} footer a`), "[718,667,231,52]");
log("wish continue", await box(`${w} footer button`), "[969,667,231,52]");
await b.close();
