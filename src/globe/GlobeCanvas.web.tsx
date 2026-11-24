import { useCallback, useEffect, useRef } from 'react';

import { colors } from '@/theme';

import { SUBPIXEL } from './projector';
import type { Frame, Paint } from './scene';
import { useFrameLoop } from './useFrameLoop';

function draw(ctx: CanvasRenderingContext2D, frame: Frame, dpr: number) {
  const { width, height } = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { cx, cy, r } = frame;

  const circle = (x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  };

  const glow = ctx.createRadialGradient(cx, cy, r * 0.82 * 1.12, cx, cy, r * 1.12);
  glow.addColorStop(0, colors.atmosphere);
  glow.addColorStop(1, 'rgba(140,230,255,0)');
  ctx.fillStyle = glow;
  circle(cx, cy, r * 1.12);
  ctx.fill();

  const ocean = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.35, cy - r * 0.4, r * 1.5);
  ocean.addColorStop(0, colors.oceanLight);
  ocean.addColorStop(1, colors.oceanDeep);
  ctx.fillStyle = ocean;
  circle(cx, cy, r);
  ctx.fill();

  ctx.save();
  ctx.scale(1 / SUBPIXEL, 1 / SUBPIXEL);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colors.graticule;
  ctx.lineWidth = SUBPIXEL * 0.8;
  ctx.stroke(new Path2D(frame.graticule));
  for (const l of frame.land) {
    ctx.fillStyle = l.color;
    ctx.fill(new Path2D(l.d));
  }
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = SUBPIXEL * 0.8;
  ctx.stroke(new Path2D(frame.borders));
  for (const o of frame.outlines) {
    const p = new Path2D(o.d);
    ctx.save();
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = o.color;
    ctx.lineWidth = SUBPIXEL * 5;
    ctx.stroke(p);
    ctx.restore();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = SUBPIXEL * 2;
    ctx.stroke(p);
  }
  ctx.restore();

  for (const m of frame.markers) {
    circle(m.x, m.y, m.r);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const shade = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.3, cy - r * 0.35, r * 1.45);
  shade.addColorStop(0, 'rgba(255,255,255,0.22)');
  shade.addColorStop(0.45, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(30,0,80,0.38)');
  ctx.fillStyle = shade;
  circle(cx, cy, r);
  ctx.fill();

  for (const ring of frame.rings) {
    ctx.save();
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 2.5;
    circle(ring.x, ring.y, ring.r);
    ctx.stroke();
    ctx.restore();
  }
}

/** Web renderer: a plain 2D canvas, drawn imperatively (decision 006). */
export function GlobeCanvas({ paint }: { paint: Paint }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<Frame | null>(null);

  const render = useCallback((frame: Frame) => {
    last.current = frame;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    draw(ctx, frame, dpr);
  }, []);

  useFrameLoop(paint, render);

  useEffect(() => {
    const onResize = () => last.current && render(last.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
