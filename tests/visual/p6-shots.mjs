// P6 visual helper: captures login / register / forgot / track / checkout and prints key boxes in page
// coordinates next to the Figma numbers (frames 3:22750, 3:23089, 3:23424, 3:23740, 3:22268).
// Usage: node tests/visual/p6-shots.mjs <outDir> [baseUrl=http://localhost:3000]
import { chromium } from "@playwright/test";

const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1000 } });
const page = await context.newPage();

const box = (selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [
      Math.round(r.left),
      Math.round(r.top + scrollY),
      Math.round(r.width),
      Math.round(r.height),
    ];
  }, selector);

async function shot(route, name, setup) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
  if (setup) await setup();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`${name}: page height ${height}`);
}

// ---- login (Figma 3:22750: card [625,690,670,540]; input1 y=858, input2 y=967, button [645,1085,569,60]) ----
await shot("/login", "login");
console.log("  card", await box("main div[class*='card'], div[class*='AuthForms_card']"));
console.log("  tabs", await box("nav[aria-label='Account']"), "figma [860,740,200,41]");
console.log("  input1", await box("[data-testid='field-identifier']"), "figma y=858 h52 w570");
console.log("  input2", await box("[data-testid='field-password']"), "figma y=967");
console.log("  submit", await box("[data-testid='auth-submit']"), "figma [645,1085,569,60]");

await shot("/register", "register");
await shot("/forgot-password", "forgot");
await shot("/track-order", "track");
console.log("  card", await box("div[class*='AuthForms_card']"));

// ---- checkout (Figma 3:22268, coupon open) ----
const api = (p, data) => page.request.post(`${base}${p}`, { data });
await page.goto(`${base}/`, { waitUntil: "networkidle" });
for (const [slug, quantity] of [
  ["the-renewal-serum", 2],
  ["glow-cleansing-bar", 1],
]) {
  const r = await api("/api/cart/items", { slug, quantity });
  console.log("add", slug, r.status());
}
await shot("/checkout", "checkout", async () => {
  await page.getByRole("button", { name: "Click here" }).click();
});
const ids = [
  "firstName",
  "lastName",
  "company",
  "country",
  "address1",
  "address2",
  "city",
  "postcode",
  "phone",
  "email",
  "notes",
];
const figma = [1154, 1258, 1362, 1466, 1570, 1642, 1746, 1850, 1954, 2058, 2162];
for (const [i, id] of ids.entries()) {
  console.log(`  ${id}`, await box(`[data-testid='field-${id}']`), `figma y=${figma[i]}`);
}
console.log("  coupon bar", await box("div[class*='couponBar']"), "figma [300,690,1320,70]");
console.log("  coupon input", await box("[data-testid='coupon-input']"), "figma [300,781,260,54]");
console.log("  panel", await box("aside[aria-label='Your order']"), "figma [1200,894,420,1181]");
console.log("  place", await box("[data-testid='place-order']"), "figma [1230,1852,360,60]");
for (const [label, sel, f] of [
  ["panel h2", "aside[aria-label='Your order'] h2", "cap-top 924"],
  ["panel head", "aside[aria-label='Your order'] div[class*='head']", "cap-top 978, rule 1004"],
  ["item 1 thumb", "li[class*='item'] div[class*='thumb']", "[1230,1019,90,104]"],
  ["item 1 name", "li[class*='item'] p[class*='itemName']", "cap-top 1051"],
  ["subtotal row", "dl[class*='totals'] > div", "label cap-top 1299"],
  ["total dd", "[data-testid='checkout-total']", "cap-top 1340 (24px)"],
  ["methods", "fieldset", "first radio y=1407"],
  ["privacy", "p[class*='privacy']", "cap-top 1678"],
  ["terms", "div[class*='terms']", "box y=1789"],
  ["secure", "div[class*='secure']", "[1230,1929,360,121]"],
]) {
  console.log(`  ${label}`, await box(sel), `figma ${f}`);
}
console.log("  shipping bar", await box("[data-testid='shipping-bar']"), "figma [300,894,870,104]");
await browser.close();
