import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

/** Plain violet → magenta gradient behind everything (docs/specs/design.md). */
export function Background() {
  return (
    <LinearGradient
      colors={[colors.bgFrom, colors.bgTo]}
      start={{ x: 0, y: 0.2 }}
      end={{ x: 1, y: 0.8 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
