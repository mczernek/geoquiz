// Renders the app icons from the globe renderer itself (src/globe), as SVG into design/icon, then
// rasterizes them with headless Chrome into assets/images. Run: pnpm icons (needs Google Chrome).

import { writeFileSync } from 'node:fs';
import { computeFrame, EMPTY_PAINT } from '../src/globe/scene';
import { SUBPIXEL } from '../src/globe/projector';
import { colors } from '../src/theme';

const out = process.argv[2];

function globe(size: number, r: number, opts: { mono?: boolean } = {}) {
  const c = size / 2;
  const f = computeFrame(
    { center: [12, 28], zoom: 1, slot: { cx: c, cy: c, r }, width: size, height: size, moving: false },
    EMPTY_PAINT,
  );
  const s = 1 / SUBPIXEL;
  if (opts.mono) {
    return `<circle cx="${c}" cy="${c}" r="${r - 12}" fill="none" stroke="white" stroke-width="24"/>
<g transform="scale(${s})"><path d="${f.land.map((l) => l.d).join('')}" fill="white"/></g>`;
  }
  return `<defs>
  <radialGradient id="glow" cx="${c}" cy="${c}" r="${r * 1.14}" gradientUnits="userSpaceOnUse">
    <stop offset="0.82" stop-color="rgb(140,230,255)" stop-opacity="0.6"/><stop offset="1" stop-color="rgb(140,230,255)" stop-opacity="0"/></radialGradient>
  <radialGradient id="ocean" cx="${c - r * 0.35}" cy="${c - r * 0.4}" r="${r * 1.5}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${colors.oceanLight}"/><stop offset="1" stop-color="${colors.oceanDeep}"/></radialGradient>
  <radialGradient id="shade" cx="${c - r * 0.3}" cy="${c - r * 0.35}" r="${r * 1.45}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="white" stop-opacity="0.25"/><stop offset="0.45" stop-color="white" stop-opacity="0"/>
    <stop offset="1" stop-color="rgb(30,0,80)" stop-opacity="0.4"/></radialGradient>
</defs>
<circle cx="${c}" cy="${c}" r="${r * 1.14}" fill="url(#glow)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#ocean)"/>
<g transform="scale(${s})">
  <path d="${f.graticule}" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="${SUBPIXEL * 1.5}"/>
  ${f.land.map((l) => `<path d="${l.d}" fill="${colors.land}"/>`).join('\n')}
  <path d="${f.borders}" fill="none" stroke="${colors.border}" stroke-width="${SUBPIXEL * 1.6}" stroke-linejoin="round"/>
</g>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#shade)"/>`;
}

const bg = (size: number) => `<defs><linearGradient id="bg" x1="0" y1="0.2" x2="1" y2="0.8">
<stop offset="0" stop-color="${colors.bgFrom}"/><stop offset="1" stop-color="${colors.bgTo}"/></linearGradient></defs>
<rect width="${size}" height="${size}" fill="url(#bg)"/>`;
const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

// iOS / store icon: full bleed gradient with the globe.
writeFileSync(`${out}/icon.svg`, svg(1024, bg(1024) + globe(1024, 360)));
// Android adaptive: foreground within the 66% safe zone, gradient background, monochrome silhouette.
writeFileSync(`${out}/android-icon-foreground.svg`, svg(1024, globe(1024, 270)));
writeFileSync(`${out}/android-icon-background.svg`, svg(1024, bg(1024)));
writeFileSync(`${out}/android-icon-monochrome.svg`, svg(1024, globe(1024, 270, { mono: true })));
// Splash: the globe alone on the purple splash background.
writeFileSync(`${out}/splash-icon.svg`, svg(1024, globe(1024, 440)));
writeFileSync(`${out}/favicon.svg`, svg(256, bg(256) + globe(256, 100)));
