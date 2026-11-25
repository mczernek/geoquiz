import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme';

const CONFETTI_COLORS = [colors.accent, colors.correct, colors.target, '#46C2FF', '#FFFFFF', '#FF8A3D'];
const PARTICLES = 34;
const DURATION = 1300;

interface Particle {
  angle: number;
  speed: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLES }, (_, i) => ({
    // Mostly upwards, fanning out.
    angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3,
    speed: 220 + Math.random() * 260,
    spin: (Math.random() - 0.5) * 900,
    size: 7 + Math.random() * 7,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() < 0.35,
  }));
}

function Piece({ p, progress }: { p: Particle; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    const s = (t * DURATION) / 1000;
    const x = Math.cos(p.angle) * p.speed * s;
    // Gravity pulls the pieces down after the burst.
    const y = Math.sin(p.angle) * p.speed * s + 520 * s * s;
    return {
      opacity: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p.spin * s}deg` },
        { scaleY: 0.6 + 0.4 * Math.cos(s * 12) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: p.size,
          height: p.round ? p.size : p.size * 0.55,
          borderRadius: p.round ? p.size / 2 : 2,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

function Ring({ progress, delay, color }: { progress: SharedValue<number>; delay: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.get() - delay) / (1 - delay)));
    return { opacity: t === 0 ? 0 : 1 - t, transform: [{ scale: 0.2 + t * 2.4 }] };
  });
  return <Animated.View style={[styles.ring, { borderColor: color }, style]} />;
}

/** A confetti burst with expanding rings, from a point on screen (the country on the globe). */
export function Celebration({ x, y, burst }: { x: number; y: number; burst: number }) {
  const progress = useSharedValue(0);
  const particles = useMemo(() => (burst ? makeParticles() : []), [burst]);

  useEffect(() => {
    if (!burst) return;
    progress.set(0);
    progress.set(withDelay(30, withTiming(1, { duration: DURATION, easing: Easing.linear })));
  }, [burst, progress]);

  if (!burst) return null;
  return (
    <View style={[styles.origin, { left: x, top: y }]} pointerEvents="none">
      <Ring progress={progress} delay={0} color={colors.correct} />
      <Ring progress={progress} delay={0.15} color={colors.white} />
      {particles.map((p, i) => (
        <Piece key={`${burst}-${i}`} p={p} progress={progress} />
      ))}
    </View>
  );
}

/** Expanding red ring where the wrong answer was. */
export function Miss({ x, y, burst }: { x: number; y: number; burst: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!burst) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [burst, progress]);
  if (!burst) return null;
  return (
    <View style={[styles.origin, { left: x, top: y }]} pointerEvents="none">
      <Ring progress={progress} delay={0} color={colors.wrong} />
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
  ring: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 4 },
});
