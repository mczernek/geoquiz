import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { useI18n } from '@/i18n';
import { colors, radius } from '@/theme';
import { Text } from '@/ui/Text';

function Toast({ streak }: { streak: number }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(id);
  }, []);
  if (!visible) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        entering={ZoomIn.springify().damping(9).stiffness(200)}
        exiting={FadeOut.duration(250)}
        style={styles.toast}
      >
        <Text variant="title" color={colors.ink}>
          {t.play.streak(streak)}
        </Text>
      </Animated.View>
    </View>
  );
}

/** "🔥 5 in a row!" for every fifth correct answer in a row. */
export function StreakToast({ streak }: { streak: number }) {
  return streak > 0 && streak % 5 === 0 ? <Toast key={streak} streak={streak} /> : null;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center' },
  toast: {
    backgroundColor: colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#2A0060',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
