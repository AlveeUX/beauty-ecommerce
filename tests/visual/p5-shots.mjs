// P5 visual helper: fills a cart through the API, then captures drawer / cart / wishlist / compare.
import { chromium } from "@playwright/test";

const out = process.argv[2];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1000 } });
const page = await context.newPage();
await page.goto("http://localhost:3000/product/the-renewal-serum", { waitUntil: "networkidle" });
for (const slug of ["the-renewal-serum", "barrier-repair-cream", "glow-cleansing-bar"]) {
  const r = await page.request.post("http://localhost:3000/api/cart/items", {
    data: { slug, quantity: 1 },
  });
  console.log(slug, r.status());
}
await page.evaluate(() => {
  localStorage.setItem(
    "cosmia.wishlist.v1",
    JSON.stringify(["the-renewal-serum", "barrier-repair-cream", "glow-cleansing-bar"]),
  );
  localStorage.setItem(
    "cosmia.compare.v1",
    JSON.stringify(["the-renewal-serum", "barrier-repair-cream", "glow-cleansing-bar"]),
  );
});
await page.reload({ waitUntil: "networkidle" });
await page.getByTestId("cart-link").click();
await page.getByTestId("cart-drawer").waitFor();
await page.screenshot({ path: `${out}/drawer.png` });
await page.keyboard.press("Escape");
for (const [route, name] of [
  ["cart", "cart"],
  ["wishlist", "wishlist"],
  ["compare", "compare"],
]) {
  await page.goto(`http://localhost:3000/${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
await browser.close();
