import { geoContains } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import { COUNTRIES, countryByCode, isTiny, type Country } from '@/domain/countries';

import { boundOf, lonLatToXyz, makeRing, type Bound, type Ring } from './projector';

export type LonLat = [number, number];
export const LODS = ['low', 'mid', 'high'] as const;
export type Lod = (typeof LODS)[number];

export interface Shape {
  /** ISO alpha-2, or a synthetic id for land that isn't a quiz country (Greenland, Western Sahara…). */
  id: string;
  /** Detailed geometry for hit tests. */
  geometry: Feature<Geometry>;
  /** Rings to draw, per level of detail. */
  rings: Record<Lod, Ring[]>;
  /** Bounding circle for culling the whole shape. */
  bound: Bound;
}

export interface World {
  shapes: Shape[];
  byId: Map<string, Shape>;
  /** Quiz countries too small to see or tap: drawn as markers. */
  tiny: Country[];
  graticule: Ring[];
}

type WorldTopology = Topology<{ countries: GeometryCollection }>;

let world: World | null = null;

function decode(topo: WorldTopology): Feature<Geometry>[] {
  return (feature(topo, topo.objects.countries) as FeatureCollection<Geometry>).features;
}

function ringsOf(f: Feature<Geometry>): Ring[] {
  const g = f.geometry;
  const polygons: Position[][][] =
    g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polygons.flatMap((polygon) => polygon.filter((r) => r.length > 3).map((r) => makeRing(r, true)));
}

function graticuleRings(): Ring[] {
  const lines: number[][][] = [];
  for (let lon = -180; lon < 180; lon += 15) {
    const line: number[][] = [];
    for (let lat = -80; lat <= 80; lat += 2) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const line: number[][] = [];
    for (let lon = -180; lon <= 180; lon += 2) line.push([lon, lat]);
    lines.push(line);
  }
  return lines.map((l) => makeRing(l, false));
}

/** Decodes the bundled borders once, on first use. */
export function getWorld(): World {
  if (world) return world;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 1 MB JSON, loaded lazily.
  const data = require('../../assets/geo/world.json') as Record<Lod, WorldTopology>;
  const decoded = { low: decode(data.low), mid: decode(data.mid), high: decode(data.high) };
  const shapes = decoded.high.map((f, i): Shape => {
    const rings = { low: ringsOf(decoded.low[i]), mid: ringsOf(decoded.mid[i]), high: ringsOf(f) };
    return { id: f.id ? String(f.id) : `_${i}`, geometry: f, rings, bound: boundOf(rings.high) };
  });
  world = {
    shapes,
    byId: new Map(shapes.map((s) => [s.id, s])),
    tiny: COUNTRIES.filter(isTiny),
    graticule: graticuleRings(),
  };
  return world;
}

/** The quiz country at a point on the globe, if any. */
export function countryAt(point: LonLat): string | null {
  const { shapes } = getWorld();
  const [x, y, z] = lonLatToXyz(point[0], point[1]);
  for (const shape of shapes) {
    if (!countryByCode(shape.id)) continue;
    const b = shape.bound;
    if (Math.acos(Math.min(1, x * b.cx + y * b.cy + z * b.cz)) > b.radius + 1e-6) continue;
    if (geoContains(shape.geometry, point)) return shape.id;
  }
  return null;
}

/** The tiny country whose marker is within `maxPx` of a screen point (they win over the land around them). */
export function tinyNear(
  x: number,
  y: number,
  maxPx: number,
  project: (p: LonLat) => [number, number] | null,
): string | null {
  let best: string | null = null;
  let bestD = maxPx;
  for (const c of getWorld().tiny) {
    const p = project([c.focus[0], c.focus[1]]);
    if (!p) continue;
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d <= bestD) {
      bestD = d;
      best = c.code;
    }
  }
  return best;
}
