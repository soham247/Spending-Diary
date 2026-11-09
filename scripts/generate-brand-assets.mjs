import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = new URL("../", import.meta.url);
const source = await readFile(new URL("public/brand/logo.svg", root), "utf8");
const background = /\s*<rect[^>]+\/>/;
const mark = source.replace(background, "").replaceAll("#fffbeb", "#b45309");
const badge = source.replace(background, "").replaceAll("#fffbeb", "#ffffff");
const maskable = source.replace('rx="14"', 'rx="0"');

async function png(svg, size, destination) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(destination, root)));
}

await writeFile(new URL("public/brand/mark.svg", root), mark);
await Promise.all([
  png(source, 192, "public/brand/icon-192.png"),
  png(source, 512, "public/brand/icon-512.png"),
  png(maskable, 512, "public/brand/icon-maskable-512.png"),
  png(maskable, 180, "src/app/apple-icon.png"),
  png(badge, 96, "public/brand/badge-96.png"),
]);

const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(source)).resize(size, size).png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile(
  new URL("src/app/favicon.ico", root),
  Buffer.concat([header, ...images]),
);
