import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/haptics';
import { colors, radius } from '@/theme';

import { Pressy } from './Pressy';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

const KINDS: Record<Kind, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, fg: colors.ink },
  secondary: { bg: colors.white, fg: colors.ink },
  ghost: { bg: colors.glass, fg: colors.white, border: colors.glassBorder },
  success: { bg: colors.correct, fg: colors.ink },
  danger: { bg: colors.wrong, fg: colors.white },
};

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
  size = 'l',
  testID,
}: {
  title: string;
  onPress: () => void;
  kind?: Kind;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'm' | 'l';
  testID?: string;
}) {
  const k = KINDS[kind];
  return (
    <Pressy
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.press();
        onPress();
      }}
      style={[
        styles.base,
        size === 'm' && styles.medium,
        { backgroundColor: k.bg, borderColor: k.border ?? 'transparent', opacity: disabled ? 0.5 : 1 },
        kind !== 'ghost' && styles.shadow,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={k.fg} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={size === 'm' ? 18 : 22} color={k.fg} />}
            <Text variant={size === 'm' ? 'label' : 'heading'} color={k.fg}>
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressy>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  style,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.press();
        onPress();
      }}
      hitSlop={8}
      style={[styles.icon, style]}
    >
      <Ionicons name={icon} size={22} color={colors.white} />
    </Pressy>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  medium: { minHeight: 44, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shadow: {
    shadowColor: '#2A0060',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
