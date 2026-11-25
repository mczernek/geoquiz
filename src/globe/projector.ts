/**
 * Fast orthographic projection for drawing (decision 006). d3-geo's stream pipeline costs ~0.5 µs per point, too
 * slow for 60 fps on Hermes, so rings are precomputed as unit vectors and projected with one dot product per axis.
 *
 * - Fills: points on the far side are pushed radially onto the horizon, so a ring crossing it is closed along the
 *   globe's edge. Rings entirely on the far side are skipped.
 * - Strokes: only the visible parts, cut exactly at the horizon. Segments along the antimeridian or a pole (cuts in
 *   the source data, not real borders) are not stroked.
 *
 * Paths are SVG strings with integer coordinates in units of 1/SUBPIXEL px (integers stringify fast); renderers
 * scale them by 1/SUBPIXEL.
 */
export const SUBPIXEL = 4;

export interface Ring {
  /** x, y, z per point. */
  xyz: Float64Array;
  /** 1 where the segment ending at this point is a data cut (antimeridian, pole). */
  cut: Uint8Array;
  /** Bounding circle: unit vector and angular radius. */
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  closed: boolean;
  hasCut: boolean;
}

export interface Bound {
  cx: number;
  cy: number;
  cz: number;
  radius: number;
}

/** A circle containing every ring (centre = normalized mean of the ring centres). */
export function boundOf(rings: readonly Ring[]): Bound {
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const r of rings) {
    sx += r.cx;
    sy += r.cy;
    sz += r.cz;
  }
  const len = Math.hypot(sx, sy, sz) || 1;
  const b = { cx: sx / len, cy: sy / len, cz: sz / len, radius: 0 };
  for (const r of rings) {
    const d = Math.acos(Math.max(-1, Math.min(1, r.cx * b.cx + r.cy * b.cy + r.cz * b.cz)));
    b.radius = Math.max(b.radius, d + r.radius);
  }
  if (rings.length === 0) b.radius = Math.PI;
  return b;
}

export interface View {
  /** Unit vectors: towards the viewer, screen right (east), screen up (north). */
  v: [number, number, number];
  e: [number, number, number];
  n: [number, number, number];
  /** Screen centre and globe radius in px. */
  sx: number;
  sy: number;
  scale: number;
  /** Angular radius of the globe area inside the screen. */
  visibleAngle: number;
}

const RAD = Math.PI / 180;

export function lonLatToXyz(lon: number, lat: number): [number, number, number] {
  const l = lon * RAD;
  const p = lat * RAD;
  const c = Math.cos(p);
  return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
}

function isCut(a: number[], b: number[]): boolean {
  const lonCut = Math.abs(Math.abs(a[0]) - 180) < 1e-6 && Math.abs(Math.abs(b[0]) - 180) < 1e-6;
  const poleCut = Math.abs(Math.abs(a[1]) - 90) < 1e-6 || Math.abs(Math.abs(b[1]) - 90) < 1e-6;
  return lonCut || poleCut;
}

export function makeRing(coords: readonly number[][], closed: boolean): Ring {
  const n = coords.length;
  const xyz = new Float64Array(n * 3);
  const cut = new Uint8Array(n);
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (let i = 0; i < n; i++) {
    const [x, y, z] = lonLatToXyz(coords[i][0], coords[i][1]);
    xyz[i * 3] = x;
    xyz[i * 3 + 1] = y;
    xyz[i * 3 + 2] = z;
    sx += x;
    sy += y;
    sz += z;
    if (i > 0 && isCut(coords[i - 1], coords[i])) cut[i] = 1;
  }
  const len = Math.hypot(sx, sy, sz) || 1;
  const cx = sx / len;
  const cy = sy / len;
  const cz = sz / len;
  let minDot = 1;
  for (let i = 0; i < n; i++) {
    minDot = Math.min(minDot, xyz[i * 3] * cx + xyz[i * 3 + 1] * cy + xyz[i * 3 + 2] * cz);
  }
  const radius = Math.acos(Math.max(-1, Math.min(1, minDot)));
  return { xyz, cut, cx, cy, cz, radius, closed, hasCut: cut.includes(1) };
}

export function makeView(
  center: [number, number],
  scale: number,
  sx: number,
  sy: number,
  width: number,
  height: number,
): View {
  const l = center[0] * RAD;
  const p = center[1] * RAD;
  const v: [number, number, number] = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  const e: [number, number, number] = [-Math.sin(l), Math.cos(l), 0];
  const n: [number, number, number] = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
  const corner = Math.max(
    Math.hypot(sx, sy),
    Math.hypot(width - sx, sy),
    Math.hypot(sx, height - sy),
    Math.hypot(width - sx, height - sy),
  );
  const visibleAngle = corner >= scale ? Math.PI / 2 : Math.asin(corner / scale);
  return { v, e, n, sx, sy, scale, visibleAngle };
}

export function isVisible(ring: Bound, view: View): boolean {
  const [vx, vy, vz] = view.v;
  const d = ring.cx * vx + ring.cy * vy + ring.cz * vz;
  return Math.acos(Math.max(-1, Math.min(1, d))) - ring.radius < view.visibleAngle;
}

/** Screen position (px) of a unit vector, or null on the far side. */
export function projectPoint(view: View, x: number, y: number, z: number): [number, number] | null {
  const { v, e, n } = view;
  if (x * v[0] + y * v[1] + z * v[2] < 0) return null;
  return [
    view.sx + view.scale * (x * e[0] + y * e[1] + z * e[2]),
    view.sy - view.scale * (x * n[0] + y * n[1] + z * n[2]),
  ];
}

export interface RingPaths {
  /** Empty when the ring is entirely hidden or not fillable. */
  fill: string;
  stroke: string;
}

/** Projects one ring. Returns empty strings when nothing of it is visible. */
export function projectRing(ring: Ring, view: View): RingPaths {
  const { xyz, cut } = ring;
  const n = xyz.length / 3;
  const [vx, vy, vz] = view.v;
  const [ex, ey, ez] = view.e;
  const [nx, ny, nz] = view.n;
  const k = view.scale * SUBPIXEL;
  const ox = view.sx * SUBPIXEL;
  const oy = view.sy * SUBPIXEL;

  let fill = '';
  let stroke = '';
  let anyVisible = false;
  let allVisible = true;
  let prevD = 0;
  let prevX = 0;
  let prevY = 0;
  let strokeOpen = false;

  for (let i = 0; i < n; i++) {
    const px = xyz[i * 3];
    const py = xyz[i * 3 + 1];
    const pz = xyz[i * 3 + 2];
    const d = px * vx + py * vy + pz * vz;
    const sxp = px * ex + py * ey + pz * ez;
    const syp = px * nx + py * ny + pz * nz;

    // Fill: far-side points go to the horizon along their direction.
    let fx = sxp;
    let fy = syp;
    if (d < 0) {
      const len = Math.hypot(sxp, syp) || 1;
      fx /= len;
      fy /= len;
      allVisible = false;
    } else anyVisible = true;
    fill += (i === 0 ? 'M' : 'L') + Math.round(ox + k * fx) + ',' + Math.round(oy - k * fy);

    // Stroke: visible parts only, cut at the horizon.
    if (i > 0) {
      const crosses = d >= 0 !== prevD >= 0;
      let hx = 0;
      let hy = 0;
      if (crosses) {
        const t = prevD / (prevD - d);
        hx = prevX + (sxp - prevX) * t;
        hy = prevY + (syp - prevY) * t;
        const len = Math.hypot(hx, hy) || 1;
        hx /= len;
        hy /= len;
      }
      if (d >= 0) {
        if (cut[i]) strokeOpen = false;
        else if (!strokeOpen || crosses) {
          const sx0 = crosses ? hx : prevX;
          const sy0 = crosses ? hy : prevY;
          stroke += 'M' + Math.round(ox + k * sx0) + ',' + Math.round(oy - k * sy0);
          strokeOpen = true;
        }
        if (strokeOpen) stroke += 'L' + Math.round(ox + k * sxp) + ',' + Math.round(oy - k * syp);
      } else if (prevD >= 0 && strokeOpen && !cut[i]) {
        stroke += 'L' + Math.round(ox + k * hx) + ',' + Math.round(oy - k * hy);
        strokeOpen = false;
      } else strokeOpen = false;
    } else if (d >= 0) {
      stroke = 'M' + Math.round(ox + k * sxp) + ',' + Math.round(oy - k * syp);
      strokeOpen = true;
    }

    prevD = d;
    prevX = sxp;
    prevY = syp;
  }

  if (!anyVisible) return { fill: '', stroke: '' };
  return {
    fill: ring.closed && n > 2 ? fill + 'Z' : '',
    stroke: allVisible && ring.closed && !ring.hasCut ? fill + 'Z' : stroke,
  };
}
