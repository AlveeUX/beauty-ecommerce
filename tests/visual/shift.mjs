// Finds the integer (dx,dy) that best aligns the capture with the Figma reference in a region.
// Usage: node tests/visual/shift.mjs <x> <y> <w> <h> [implOffsetY=0]
import sharp from "sharp";
const [X, Y, W, H, O = 0] = process.argv.slice(2).map(Number);
const full = async (f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const fig = await full("tests/visual/references/home-figma.png");
const imp = await full("tests/visual/baselines/home-impl.png");
const px = (img, x, y) => (y * img.info.width + x) * 3;
const res = [];
for (let dy = -4; dy <= 4; dy++)
  for (let dx = -4; dx <= 4; dx++) {
    let d = 0,
      n = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const a = px(fig, X + x, Y + y),
          b = px(imp, X + x + dx, Y + y + dy + O);
        d +=
          Math.abs(fig.data[a] - imp.data[b]) +
          Math.abs(fig.data[a + 1] - imp.data[b + 1]) +
          Math.abs(fig.data[a + 2] - imp.data[b + 2]);
        n += 3;
      }
    res.push([d / n, dx, dy]);
  }
res.sort((p, q) => p[0] - q[0]);
const zero = res.find((r) => r[1] === 0 && r[2] === 0);
console.log(
  `best dx=${res[0][1]} dy=${res[0][2]} diff=${res[0][0].toFixed(2)} | at 0,0 diff=${zero[0].toFixed(2)}   (impl is shifted by dx,dy relative to figma)`,
);
