// Renders the app icons from SVG (run once after changing the design):
//   node scripts/make-icons.mjs
// Uses sharp, which ships with Next.js (no extra dependency).
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const BLUE = "#12608F";

// Full-bleed square (iOS / Android apply their own corner mask)
const square = (pinScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BLUE}"/>
  <g transform="translate(256 256) scale(${pinScale}) translate(-256 -256)">
    <path d="M136 392 C 190 380, 196 330, 248 334" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="18" stroke-linecap="round" stroke-dasharray="2 34"/>
    <path d="M290 104c-61 0-110 48-110 108 0 82 110 176 110 176s110-94 110-176c0-60-49-108-110-108z" fill="#FFFFFF"/>
    <circle cx="290" cy="210" r="42" fill="${BLUE}"/>
  </g>
</svg>`;

const out = [
  ["public/icons/icon-192.png", 192, square()],
  ["public/icons/icon-512.png", 512, square()],
  // maskable: keep the artwork inside the 80% safe zone
  ["public/icons/maskable-512.png", 512, square(0.78)],
  ["src/app/apple-icon.png", 180, square(0.92)],
];

for (const [file, size, svg] of out) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(file, png);
  console.log("wrote", file, size);
}
