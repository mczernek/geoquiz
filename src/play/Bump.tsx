import { useEffect, type ReactNode } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Jumps whenever `value` changes (score, streak). */
export function Bump({ value, children, strength = 1.35 }: { value: number; children: ReactNode; strength?: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (value === 0) return;
    scale.set(
      withSequence(withTiming(strength, { duration: 110 }), withSpring(1, { duration: 450, dampingRatio: 0.35 })),
    );
  }, [value, scale, strength]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
