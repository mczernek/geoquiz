import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { haptics } from '@/haptics';
import { colors, radius } from '@/theme';

import { Pressy } from './Pressy';
import { Text } from './Text';

/** A toggle pill: white when selected, glass when not. */
export function Chip({
  label,
  detail,
  selected,
  onPress,
  icon,
  testID,
  onCard = false,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  testID?: string;
  /** On a white card instead of the gradient. */
  onCard?: boolean;
}) {
  const fg = onCard ? (selected ? colors.white : colors.ink) : selected ? colors.ink : colors.white;
  return (
    <Pressy
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.chip, onCard ? (selected ? styles.cardOn : styles.cardOff) : selected ? styles.on : styles.off]}
    >
      <View style={styles.row}>
        {icon && <Ionicons name={icon} size={18} color={fg} />}
        <Text variant="label" color={fg}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color={selected !== onCard ? colors.inkSoft : 'rgba(255,255,255,0.8)'}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5 },
  on: { backgroundColor: colors.white, borderColor: colors.white },
  off: { backgroundColor: colors.glass, borderColor: colors.glassBorder },
  cardOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cardOff: { backgroundColor: '#F3EEFF', borderColor: '#DCCFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
