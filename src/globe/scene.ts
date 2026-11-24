import { countryByCode } from '@/domain/countries';
import { colors } from '@/theme';

import type { CameraState } from './camera';
import { getWorld, type Lod } from './geo';
import { isVisible, lonLatToXyz, makeView, projectPoint, projectRing, type View } from './projector';

/** What screens ask the globe to show (decision 005). */
export interface Paint {
  /** Fill per country code; others use the default land color. */
  fills: Readonly<Record<string, string>>;
  /** Countries drawn with a thick glowing outline (the answer, the question). */
  outlines: Readonly<Record<string, string>>;
  /** Countries with a ring around them, so even tiny ones are easy to spot. */
  rings: Readonly<Record<string, string>>;
}

export const EMPTY_PAINT: Paint = { fills: {}, outlines: {}, rings: {} };

export interface Circle {
  x: number;
  y: number;
  r: number;
  color: string;
}

/** Paths are in 1/SUBPIXEL px (see projector.ts); circles and the globe in px. */
export interface Frame {
  cx: number;
  cy: number;
  /** Radius of the globe on screen. */
  r: number;
  graticule: string;
  /** Land grouped by fill color, one path each. */
  land: { color: string; d: string }[];
  borders: string;
  outlines: { color: string; d: string }[];
  markers: Circle[];
  rings: Circle[];
}

/** Detail by zoom; one level coarser while moving (decision 006). */
export function lodFor(zoom: number, moving: boolean): Lod {
  if (zoom >= 6) return 'high';
  if (zoom >= 2) return moving ? 'mid' : 'high';
  return moving ? 'low' : 'mid';
}

function viewOf(state: CameraState): View {
  const { slot, zoom } = state;
  return makeView(state.center, slot.r * zoom, slot.cx, slot.cy, state.width, state.height);
}

export function computeFrame(state: CameraState, paint: Paint): Frame {
  const { shapes, tiny, graticule } = getWorld();
  const view = viewOf(state);
  const lod = lodFor(state.zoom, state.moving);

  const byColor = new Map<string, string>();
  let borders = '';
  const outlines: Frame['outlines'] = [];
  for (const shape of shapes) {
    if (!isVisible(shape.bound, view)) continue;
    let fill = '';
    let stroke = '';
    for (const ring of shape.rings[lod]) {
      if (!isVisible(ring, view)) continue;
      const p = projectRing(ring, view);
      fill += p.fill;
      stroke += p.stroke;
    }
    if (!fill && !stroke) continue;
    const color = paint.fills[shape.id] ?? (countryByCode(shape.id) ? colors.land : colors.landOther);
    byColor.set(color, (byColor.get(color) ?? '') + fill);
    borders += stroke;
    const outline = paint.outlines[shape.id];
    if (outline) outlines.push({ color: outline, d: stroke });
  }

  let grid = '';
  for (const line of graticule) if (isVisible(line, view)) grid += projectRing(line, view).stroke;

  const at = (lon: number, lat: number) => {
    const [x, y, z] = lonLatToXyz(lon, lat);
    return projectPoint(view, x, y, z);
  };
  const markers: Circle[] = [];
  const markerR = Math.min(2.5 + state.zoom * 0.4, 6);
  for (const c of tiny) {
    const p = at(c.focus[0], c.focus[1]);
    if (p) markers.push({ x: p[0], y: p[1], r: markerR, color: paint.fills[c.code] ?? colors.land });
  }
  const rings: Circle[] = [];
  for (const [code, color] of Object.entries(paint.rings)) {
    const c = countryByCode(code);
    const p = c && at(c.focus[0], c.focus[1]);
    if (!c || !p) continue;
    const size = Math.sin((Math.min(c.focus[2], 60) * Math.PI) / 180) * view.scale;
    rings.push({ x: p[0], y: p[1], r: Math.max(size * 1.15 + 8, 18), color });
  }

  return {
    cx: view.sx,
    cy: view.sy,
    r: view.scale,
    graticule: grid,
    land: [...byColor].map(([color, d]) => ({ color, d })),
    borders,
    outlines,
    markers,
    rings,
  };
}
