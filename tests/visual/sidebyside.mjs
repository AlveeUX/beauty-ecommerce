// Usage: node tests/visual/sidebyside.mjs <figma.png> <impl.png> <y> <h> <out.png> [implOffset=0]
import sharp from "sharp";
const [a, b, y, h, out, off = "0"] = process.argv.slice(2);
const Y = Number(y),
  H = Number(h),
  O = Number(off);
const left = await sharp(a).extract({ left: 0, top: Y, width: 1920, height: H }).toBuffer();
const right = await sharp(b)
  .extract({ left: 0, top: Y + O, width: 1920, height: H })
  .toBuffer();
const merged = await sharp({ create: { width: 3860, height: H, channels: 3, background: "#f0f" } })
  .composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: 1940, top: 0 },
  ])
  .png()
  .toBuffer();
await sharp(merged).resize({ width: 1930 }).png().toFile(out);
console.log("ok", out);
