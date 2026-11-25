import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';

import { IconButton } from './Button';
import { Text } from './Text';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** A secondary screen: back button + title, content below. */
export function Screen({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.header} pointerEvents="box-none">
        <IconButton icon="arrow-back" label={t.common.back} onPress={goBack} />
        <Text variant="title" style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
      <Animated.View
        entering={FadeInDown.springify().damping(16).stiffness(150)}
        style={styles.body}
        pointerEvents="box-none"
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  title: { flex: 1 },
  body: { flex: 1 },
});
