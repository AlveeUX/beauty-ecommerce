// Mean difference per horizontal band of the whole page. Usage: node tests/visual/bands.mjs [bandHeight=200]
import sharp from "sharp";
const B = Number(process.argv[2] ?? 200);
const a = await sharp("tests/visual/references/home-figma.png")
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const b = await sharp("tests/visual/baselines/home-impl.png")
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const H = Math.min(a.info.height, b.info.height),
  W = a.info.width;
let total = 0;
for (let y = 0; y < H; y += B) {
  const h = Math.min(B, H - y);
  let d = 0;
  for (let i = y * W * 3; i < (y + h) * W * 3; i++) d += Math.abs(a.data[i] - b.data[i]);
  const m = d / (h * W * 3);
  total += d;
  console.log(String(y).padStart(5), m.toFixed(2), "#".repeat(Math.round(m * 2)));
}
console.log(
  "overall",
  (total / (H * W * 3)).toFixed(3),
  `heights ${a.info.height}/${b.info.height}`,
);
