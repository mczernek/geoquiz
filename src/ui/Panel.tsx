import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius } from '@/theme';

/** White card for questions and answers. */
export function Panel({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.panel, style]} />;
}

/** Translucent card on the gradient. */
export function GlassPanel({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.glass, style]} />;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: 20,
    shadowColor: '#2A0060',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  glass: {
    backgroundColor: 'rgba(40, 0, 110, 0.28)',
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
  },
});
