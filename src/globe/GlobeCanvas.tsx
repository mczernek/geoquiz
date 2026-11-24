import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

import { SUBPIXEL } from './projector';
import type { Frame, Paint } from './scene';
import { useFrameLoop } from './useFrameLoop';

const EMPTY = Skia.Path.Make();
const toPath = (d: string): SkPath => (d ? (Skia.Path.MakeFromSVGString(d) ?? EMPTY) : EMPTY);
const SCALE = [{ scale: 1 / SUBPIXEL }];

/** Native renderer: Skia (decision 006). */
export function GlobeCanvas({ paint }: { paint: Paint }) {
  const [frame, setFrame] = useState<Frame | null>(null);
  useFrameLoop(paint, setFrame);

  const paths = useMemo(
    () =>
      frame && {
        graticule: toPath(frame.graticule),
        land: frame.land.map((l) => ({ color: l.color, path: toPath(l.d) })),
        borders: toPath(frame.borders),
        outlines: frame.outlines.map((o) => ({ color: o.color, path: toPath(o.d) })),
      },
    [frame],
  );

  if (!frame || !paths) return null;
  const { cx, cy, r } = frame;
  const c = vec(cx, cy);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle c={c} r={r * 1.12}>
        <RadialGradient c={c} r={r * 1.12} colors={[colors.atmosphere, 'rgba(140,230,255,0)']} positions={[0.82, 1]} />
      </Circle>
      <Circle c={c} r={r}>
        <RadialGradient
          c={vec(cx - r * 0.35, cy - r * 0.4)}
          r={r * 1.5}
          colors={[colors.oceanLight, colors.oceanDeep]}
        />
      </Circle>
      <Group transform={SCALE}>
        <Path path={paths.graticule} style="stroke" strokeWidth={SUBPIXEL * 0.8} color={colors.graticule} />
        {paths.land.map((l) => (
          <Path key={l.color} path={l.path} color={l.color} />
        ))}
        <Path
          path={paths.borders}
          style="stroke"
          strokeWidth={SUBPIXEL * 0.8}
          strokeJoin="round"
          color={colors.border}
        />
        {paths.outlines.map((o, i) => (
          <Group key={i}>
            <Path path={o.path} style="stroke" strokeWidth={SUBPIXEL * 7} strokeJoin="round" color={o.color} opacity={0.55}>
              <BlurMask blur={SUBPIXEL * 3} style="normal" />
            </Path>
            <Path path={o.path} style="stroke" strokeWidth={SUBPIXEL * 2} strokeJoin="round" color="white" />
          </Group>
        ))}
      </Group>
      {frame.markers.map((m, i) => (
        <Group key={i}>
          <Circle cx={m.x} cy={m.y} r={m.r} color={m.color} />
          <Circle cx={m.x} cy={m.y} r={m.r} style="stroke" strokeWidth={1} color={colors.border} />
        </Group>
      ))}
      <Circle c={c} r={r}>
        <RadialGradient
          c={vec(cx - r * 0.3, cy - r * 0.35)}
          r={r * 1.45}
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'rgba(30,0,80,0.38)']}
          positions={[0, 0.45, 1]}
        />
      </Circle>
      {frame.rings.map((ring, i) => (
        <Group key={i}>
          <Circle cx={ring.x} cy={ring.y} r={ring.r} style="stroke" strokeWidth={6} color={ring.color} opacity={0.45}>
            <BlurMask blur={4} style="normal" />
          </Circle>
          <Circle cx={ring.x} cy={ring.y} r={ring.r} style="stroke" strokeWidth={2.5} color={ring.color} />
        </Group>
      ))}
    </Canvas>
  );
}
