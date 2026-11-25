#!/usr/bin/env node
// Checks store/play against Google Play's listing limits before an upload (store/play/README.md): text lengths and
// image sizes. Run: pnpm play:check
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../store/play/', import.meta.url).pathname;
const TEXT = { 'title.txt': 30, 'short_description.txt': 80, 'full_description.txt': 4000 };
const errors = [];

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path) {
  const b = readFileSync(path);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${path} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

for (const lang of readdirSync(join(root, 'listings'))) {
  const dir = join(root, 'listings', lang);
  for (const [file, max] of Object.entries(TEXT)) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      errors.push(`${lang}/${file}: missing`);
      continue;
    }
    // Play counts characters (code points), not bytes.
    const length = [...readFileSync(path, 'utf8').trim()].length;
    console.log(`${lang}/${file}: ${length}/${max}`);
    if (length > max) errors.push(`${lang}/${file}: ${length} characters, the limit is ${max}`);
  }
  const shots = join(dir, 'phoneScreenshots');
  const files = existsSync(shots) ? readdirSync(shots).filter((f) => f.endsWith('.png')) : [];
  if (files.length < 2 || files.length > 8) errors.push(`${lang}: ${files.length} phone screenshots, Play takes 2–8`);
  for (const f of files) {
    const [w, h] = pngSize(join(shots, f));
    const ok = Math.min(w, h) >= 320 && Math.max(w, h) <= 3840 && Math.max(w, h) / Math.min(w, h) <= 2;
    console.log(`${lang}/phoneScreenshots/${f}: ${w}×${h}`);
    if (!ok) errors.push(`${lang}/phoneScreenshots/${f}: ${w}×${h} (sides 320–3840 px, at most 2:1)`);
  }
}

const [iw, ih] = pngSize(join(root, 'graphics/icon.png'));
if (iw !== 512 || ih !== 512) errors.push(`graphics/icon.png: ${iw}×${ih}, Play wants 512×512`);

if (errors.length) {
  console.error(`\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('\nPlay listing OK');
