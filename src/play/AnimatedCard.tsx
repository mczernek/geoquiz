import { useEffect, type ReactNode } from 'react';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

/**
 * The question/answer card's motion (docs/specs/design.md → Motion): questions slide up, a correct answer pops in
 * with a bounce, a wrong one shakes.
 */
export function AnimatedCard({ phase, children }: { phase: 'question' | 'correct' | 'wrong'; children: ReactNode }) {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (phase !== 'wrong') return;
    shake.set(
      withSequence(
        withTiming(-14, { duration: 50 }),
        withTiming(14, { duration: 70 }),
        withTiming(-10, { duration: 70 }),
        withTiming(8, { duration: 60 }),
        withSpring(0, { duration: 300, dampingRatio: 0.4 }),
      ),
    );
  }, [phase, shake]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const entering =
    phase === 'correct'
      ? ZoomIn.springify().damping(11).stiffness(220)
      : phase === 'wrong'
        ? FadeInDown.duration(220)
        : FadeInDown.duration(280);

  return (
    // The layout animation and the shake both animate transforms, so they live on separate views.
    <Animated.View entering={entering}>
      <Animated.View style={style}>{children}</Animated.View>
    </Animated.View>
  );
}
