// Screenshot helper for visual verification against Figma references.
// Usage: node tests/visual/capture.mjs <url> <out.png> [width=1920] [height=1080] [full|viewport]
import { chromium } from "@playwright/test";

const [url, out, width = "1920", height = "1080", mode = "full"] = process.argv.slice(2);
if (!url || !out) {
  console.error(
    "usage: node tests/visual/capture.mjs <url> <out.png> [width] [height] [full|viewport]",
  );
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: "*,*::before,*::after{animation:none!important;transition:none!important}",
});
// Scroll through the page so lazy-loaded images are fetched before the capture.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await page.waitForLoadState("networkidle");
await page.screenshot({ path: out, fullPage: mode === "full" });
await browser.close();
console.log(`saved ${out}`);
