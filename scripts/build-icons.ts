// Renders the Globik mark (docs/brand.md) and app icons from the globe renderer itself (src/globe), as SVG into
// design/icon, then rasterizes them with headless Chrome into assets/images. Run: pnpm icons (needs Google Chrome).

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

/** Orbit tilt and shape, relative to the globe radius. */
const ORBIT = { rx: 1.42, ry: 0.36, tilt: -20, width: 0.075 };

/**
 * The mark: the globe with a tilted orbit and a spark riding it. The orbit's far half is drawn before the globe
 * (hidden behind it), the near half after, so the ring wraps around the planet.
 */
function mark(size: number, r: number, opts: { mono?: boolean } = {}) {
  const c = size / 2;
  const rx = r * ORBIT.rx;
  const ry = r * ORBIT.ry;
  const ring = opts.mono ? 'white' : colors.white;
  const arc = (sweep: 0 | 1) =>
    `<path d="M ${-rx} 0 A ${rx} ${ry} 0 0 ${sweep} ${rx} 0" fill="none" stroke="${ring}" stroke-width="${r * ORBIT.width}" stroke-linecap="round"/>`;
  // The spark sits on the near half just past the globe's edge, so it reads as orbiting towards the viewer.
  const t = (40 * Math.PI) / 180;
  const spark = `<circle cx="${rx * Math.cos(t)}" cy="${ry * Math.sin(t)}" r="${r * 0.17}" fill="${opts.mono ? 'white' : colors.target}" stroke="${opts.mono ? 'none' : 'white'}" stroke-width="${r * 0.06}"/>`;
  const orbit = (body: string) => `<g transform="translate(${c} ${c}) rotate(${ORBIT.tilt})">${body}</g>`;
  return orbit(arc(1)) + globe(size, r, opts) + orbit(arc(0) + spark);
}

const bg = (size: number) => `<defs><linearGradient id="bg" x1="0" y1="0.2" x2="1" y2="0.8">
<stop offset="0" stop-color="${colors.bgFrom}"/><stop offset="1" stop-color="${colors.bgTo}"/></linearGradient></defs>
<rect width="${size}" height="${size}" fill="url(#bg)"/>`;
const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

// iOS / store icon: full bleed gradient with the mark.
writeFileSync(`${out}/icon.svg`, svg(1024, bg(1024) + mark(1024, 300)));
// Android adaptive: foreground within the 66% safe zone, gradient background, monochrome silhouette.
writeFileSync(`${out}/android-icon-foreground.svg`, svg(1024, mark(1024, 220)));
writeFileSync(`${out}/android-icon-background.svg`, svg(1024, bg(1024)));
writeFileSync(`${out}/android-icon-monochrome.svg`, svg(1024, mark(1024, 220, { mono: true })));
// Splash: the mark alone on the purple splash background.
writeFileSync(`${out}/splash-icon.svg`, svg(1024, mark(1024, 330)));
writeFileSync(`${out}/favicon.svg`, svg(256, bg(256) + mark(256, 78)));
// In-app wordmark (src/ui/Logo.tsx): the mark on transparent, standing in for the "o".
writeFileSync(`${out}/brand-mark.svg`, svg(512, mark(512, 160)));
