// Renders the Globik mark (docs/brand.md), app icons and Play Store graphics from the globe renderer itself
// (src/globe), as SVG into design/icon, then rasterizes them with headless Chrome into assets/images and
// store/play/graphics. Run: pnpm icons (needs Google Chrome).

import { writeFileSync } from 'node:fs';
import { computeFrame, EMPTY_PAINT } from '../src/globe/scene';
import { SUBPIXEL } from '../src/globe/projector';
import { en } from '../src/i18n/en';
import { pl } from '../src/i18n/pl';
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

const bg = (size: number, opacity = 1) => `<defs><linearGradient id="bg" x1="0" y1="0.2" x2="1" y2="0.8">
<stop offset="0" stop-color="${colors.bgFrom}"/><stop offset="1" stop-color="${colors.bgTo}"/></linearGradient></defs>
<rect width="${size}" height="${size}" fill="url(#bg)"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}/>`;
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
// Play Store icon: the app icon, but Play asks for a 32-bit PNG and Chrome drops the alpha channel of a fully opaque
// capture, so the background is a hair (1/255) transparent.
writeFileSync(`${out}/store-icon.svg`, svg(1024, bg(1024, 0.996) + mark(1024, 300)));
writeFileSync(`${out}/favicon.svg`, svg(256, bg(256) + mark(256, 78)));
// In-app wordmark (src/ui/Logo.tsx): the mark on transparent, standing in for the "o".
writeFileSync(`${out}/brand-mark.svg`, svg(512, mark(512, 160)));

// Play Store feature graphic (1024×500), one per listing language: the wordmark and tagline on the left, the mark
// large on the right. Fonts are loaded from node_modules relative to design/icon (the rasterizer allows file access).
const fonts = '../../node_modules/@expo-google-fonts';
function featureGraphic(strings: typeof en) {
  const [w, h] = [1024, 500];
  const font = 128;
  const box = font * 1.1;
  const baseline = 236;
  // The wordmark as Logo.tsx lays it out: "gl", the mark as the "o" (overlapping its neighbours by a tenth of its
  // box, sitting just below the baseline), "bik".
  const glEnd = 64 + font * 0.83;
  const markX = glEnd - box * 0.1;
  const markY = baseline + font * 0.31 - box;
  const nested = (x: number, y: number, size: number) =>
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 512 512">${mark(512, 160)}</svg>`;
  const topics = `${strings.modes.flag} · ${strings.modes.capital} · ${strings.modes.map}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<style>
  @font-face { font-family: Fredoka; font-weight: 700; src: url('${fonts}/fredoka/700Bold/Fredoka_700Bold.ttf'); }
  @font-face { font-family: Nunito; font-weight: 800; src: url('${fonts}/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'); }
  @font-face { font-family: Nunito; font-weight: 700; src: url('${fonts}/nunito/700Bold/Nunito_700Bold.ttf'); }
</style>
<defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${colors.bgFrom}"/><stop offset="1" stop-color="${colors.bgTo}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#fg)"/>
${nested(530, 0, 500)}
<text x="${glEnd}" y="${baseline}" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="${font}" fill="white">gl</text>
${nested(markX, markY, box)}
<text x="${markX + box * 0.9}" y="${baseline}" font-family="Fredoka" font-weight="700" font-size="${font}" fill="white">bik</text>
<text x="68" y="${baseline + 74}" font-family="Nunito" font-weight="800" font-size="36" fill="white">${strings.tagline}</text>
<text x="68" y="${baseline + 124}" font-family="Nunito" font-weight="700" font-size="28" fill="${colors.accent}">${topics}</text>
</svg>`;
}
writeFileSync(`${out}/feature-graphic-en.svg`, featureGraphic(en));
writeFileSync(`${out}/feature-graphic-pl.svg`, featureGraphic(pl));
