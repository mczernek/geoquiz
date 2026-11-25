import { useEffect, type ReactNode } from 'react';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** A right answer settles in: a short fade and lift, no overshoot. */
const SETTLE_IN = FadeInDown.duration(240).easing(Easing.out(Easing.cubic));

/**
 * The question/answer card's motion (docs/specs/design.md → Motion): questions slide up, a correct answer settles
 * in, a wrong one gives a short shake. The globe carries the celebration; the card stays calm.
 */
export function AnimatedCard({ phase, children }: { phase: 'question' | 'correct' | 'wrong'; children: ReactNode }) {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (phase !== 'wrong') return;
    shake.set(
      withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 70 }),
        withTiming(-5, { duration: 70 }),
        withSpring(0, { duration: 250, dampingRatio: 0.7 }),
      ),
    );
  }, [phase, shake]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const entering =
    phase === 'correct' ? SETTLE_IN : phase === 'wrong' ? FadeInDown.duration(220) : FadeInDown.duration(280);

  return (
    // The layout animation and the shake both animate transforms, so they live on separate views.
    <Animated.View entering={entering}>
      <Animated.View style={style}>{children}</Animated.View>
    </Animated.View>
  );
}
