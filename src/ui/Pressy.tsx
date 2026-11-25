import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that squishes when pressed (the app's base touch feedback). */
export function Pressy({
  style,
  scaleTo = 0.94,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { duration: 180, dampingRatio: 0.6 }));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { duration: 350, dampingRatio: 0.45 }));
        props.onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
