import { geoDistance, geoInterpolate, geoOrthographic, type GeoProjection } from 'd3-geo';

import type { LonLat } from './geo';

/** Where the globe sits on screen at zoom 1: centre and radius in pixels. */
export interface Slot {
  cx: number;
  cy: number;
  r: number;
}

export interface CameraState {
  /** The point of the globe facing the viewer. */
  center: LonLat;
  zoom: number;
  slot: Slot;
  /** Screen size, for culling. */
  width: number;
  height: number;
  /** True while anything animates or the user drags: renderers draw the simplified borders. */
  moving: boolean;
}

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 80;
const MAX_LAT = 85;
const AUTO_ROTATE_DEG_PER_S = 5;
const FRICTION = 4;
/** Idle time after the last change before the detailed borders are drawn. */
const REST_DELAY_MS = 140;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const normLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

interface Flight {
  start: number;
  duration: number;
  interpolate: (t: number) => LonLat;
  zoomFrom: number;
  zoomTo: number;
  dip: number;
  resolve: () => void;
}

interface SlotTween {
  start: number;
  duration: number;
  from: Slot;
  to: Slot;
}

type Listener = (state: CameraState) => void;

/**
 * The single camera every screen shares (decision 005): gestures, fly-to animations, auto-rotation and the slot the
 * globe occupies. Runs its own requestAnimationFrame loop only while something moves.
 */
export class GlobeCamera {
  private center: LonLat = [15, 30];
  private zoom = 1;
  private slot: Slot = { cx: 200, cy: 300, r: 160 };
  private width = 400;
  private height = 800;
  private hasSlot = false;

  private velocity: [number, number] = [0, 0];
  private dragging = false;
  private flight: Flight | null = null;
  private slotTween: SlotTween | null = null;
  private autoRotate = false;

  private frame: number | null = null;
  private lastTick = 0;
  private restTimer: ReturnType<typeof setTimeout> | null = null;
  private moving = false;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): CameraState {
    return {
      center: this.center,
      zoom: this.zoom,
      slot: this.slot,
      width: this.width,
      height: this.height,
      moving: this.moving,
    };
  }

  projection(state: CameraState = this.snapshot()): GeoProjection {
    return projectionFor(state);
  }

  /** Point under a screen position, or null outside the globe. */
  invert(x: number, y: number): LonLat | null {
    const state = this.snapshot();
    const { cx, cy, r } = state.slot;
    if (Math.hypot(x - cx, y - cy) > r * state.zoom) return null;
    const p = this.projection(state).invert?.([x, y]);
    return p ? (p as LonLat) : null;
  }

  /** Screen position of a point, or null when it is on the far side. */
  project(point: LonLat): [number, number] | null {
    if (geoDistance(point, this.center) > Math.PI / 2) return null;
    return this.projection()(point) ?? null;
  }

  setScreen(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.changed();
  }

  setSlot(slot: Slot, animate = true): void {
    if (!this.hasSlot || !animate) {
      this.hasSlot = true;
      this.slot = slot;
      this.slotTween = null;
      this.changed();
      return;
    }
    const s = this.slot;
    if (s.cx === slot.cx && s.cy === slot.cy && s.r === slot.r) return;
    this.slotTween = { start: now(), duration: 550, from: { ...this.slot }, to: slot };
    this.run();
  }

  setAutoRotate(on: boolean): void {
    this.autoRotate = on;
    if (on) this.run();
  }

  getZoom(): number {
    return this.zoom;
  }

  // Gestures --------------------------------------------------------------------------------------------------

  dragStart(): void {
    this.dragging = true;
    this.velocity = [0, 0];
    this.cancelFlight();
  }

  dragBy(dx: number, dy: number): void {
    const k = 180 / Math.PI / (this.slot.r * this.zoom);
    this.center = [normLon(this.center[0] - dx * k), clamp(this.center[1] + dy * k, -MAX_LAT, MAX_LAT)];
    this.changed();
  }

  /** Velocity in px/s carries the globe on (inertia). */
  dragEnd(vx: number, vy: number): void {
    this.dragging = false;
    this.velocity = [vx, vy];
    this.run();
  }

  zoomBy(factor: number): void {
    this.cancelFlight();
    this.zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.changed();
  }

  setZoom(zoom: number): void {
    this.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.changed();
  }

  // Animations ------------------------------------------------------------------------------------------------

  /** Rotates along the great circle to `target`, zooming out halfway on long trips. */
  flyTo(target: LonLat, zoom: number, duration?: number): Promise<void> {
    this.cancelFlight();
    this.velocity = [0, 0];
    const from = this.center;
    const to: LonLat = [normLon(target[0]), clamp(target[1], -MAX_LAT, MAX_LAT)];
    const distance = geoDistance(from, to);
    const zoomTo = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const ms = duration ?? clamp(500 + distance * 420 + Math.abs(Math.log(zoomTo / this.zoom)) * 120, 600, 1700);
    return new Promise((resolve) => {
      this.flight = {
        start: now(),
        duration: ms,
        interpolate: geoInterpolate(from, to) as (t: number) => LonLat,
        zoomFrom: this.zoom,
        zoomTo,
        // How far (in log zoom) to pull back mid-flight so the user sees where they are going.
        dip: distance > 0.25 ? Math.min(Math.log(Math.max(this.zoom, zoomTo)), 2.5) * 0.7 + distance * 0.25 : 0,
        resolve,
      };
      this.run();
    });
  }

  /** Zoom at which a country with this angular radius (degrees) fills a good part of the globe. */
  static zoomToFit(radiusDeg: number, fill = 0.42, max = 14): number {
    const r = (Math.max(radiusDeg, 0.4) * Math.PI) / 180;
    return clamp(fill / Math.sin(Math.min(r, Math.PI / 2)), 1, max);
  }

  private cancelFlight(): void {
    if (!this.flight) return;
    this.flight.resolve();
    this.flight = null;
  }

  // Loop ------------------------------------------------------------------------------------------------------

  private changed(): void {
    this.moving = true;
    this.emit();
    this.scheduleRest();
  }

  private emit(): void {
    const state = this.snapshot();
    for (const l of this.listeners) l(state);
  }

  private scheduleRest(): void {
    if (this.restTimer) clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => {
      this.restTimer = null;
      if (this.isAnimating() || this.dragging) return this.scheduleRest();
      this.moving = false;
      this.emit();
    }, REST_DELAY_MS);
  }

  private isAnimating(): boolean {
    return (
      this.flight !== null ||
      this.slotTween !== null ||
      (this.autoRotate && !this.dragging) ||
      Math.hypot(...this.velocity) > 8
    );
  }

  private run(): void {
    if (this.frame !== null) return;
    this.lastTick = now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (): void => {
    this.frame = null;
    const t = now();
    const dt = Math.min((t - this.lastTick) / 1000, 0.05);
    this.lastTick = t;

    if (this.flight) {
      const f = this.flight;
      const p = clamp((t - f.start) / f.duration, 0, 1);
      const e = easeInOut(p);
      this.center = f.interpolate(e);
      this.zoom = Math.exp(lerp(Math.log(f.zoomFrom), Math.log(f.zoomTo), e) - f.dip * 4 * e * (1 - e));
      if (p >= 1) {
        this.flight = null;
        f.resolve();
      }
    } else if (!this.dragging) {
      const [vx, vy] = this.velocity;
      if (Math.hypot(vx, vy) > 8) {
        this.dragBy(vx * dt, vy * dt);
        const decay = Math.exp(-FRICTION * dt);
        this.velocity = [vx * decay, vy * decay];
      } else {
        this.velocity = [0, 0];
        if (this.autoRotate) this.center = [normLon(this.center[0] + AUTO_ROTATE_DEG_PER_S * dt), this.center[1]];
      }
    }

    if (this.slotTween) {
      const s = this.slotTween;
      const p = clamp((t - s.start) / s.duration, 0, 1);
      const e = easeInOut(p);
      this.slot = { cx: lerp(s.from.cx, s.to.cx, e), cy: lerp(s.from.cy, s.to.cy, e), r: lerp(s.from.r, s.to.r, e) };
      if (p >= 1) this.slotTween = null;
    }

    this.changed();
    if (this.isAnimating()) this.run();
  };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function projectionFor(state: CameraState): GeoProjection {
  const { slot, zoom, center } = state;
  return geoOrthographic()
    .scale(slot.r * zoom)
    .translate([slot.cx, slot.cy])
    .rotate([-center[0], -center[1]])
    .clipAngle(90)
    .precision(0.6);
}

export const camera = new GlobeCamera();
