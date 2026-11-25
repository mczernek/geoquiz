import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTINENTS, countriesIn, type Continent } from '@/domain/countries';
import { cardKey, LEARNED_BOX, MODES, statsFor, type Mode } from '@/domain/scheduler';
import { camera } from '@/globe/camera';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { useGlobeStore } from '@/globe/store';
import { useI18n } from '@/i18n';
import { poolFor, useProgress } from '@/state/progress';
import { colors } from '@/theme';
import { Button, IconButton } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Logo } from '@/ui/Logo';
import { GlassPanel } from '@/ui/Panel';
import { Text } from '@/ui/Text';
import { useNow } from '@/ui/useNow';

const MODE_ICONS = { flag: 'flag', capital: 'business', map: 'earth' } as const;

function toggle<T>(list: readonly T[], item: T): T[] {
  if (list.includes(item)) return list.length > 1 ? list.filter((x) => x !== item) : [...list];
  return [...list, item];
}

/** Colors the globe by what is selected and learned (docs/specs/screens.md → Home). */
function useHomePaint(modes: readonly Mode[], continents: readonly Continent[]) {
  const cards = useProgress((s) => s.cards);
  const setPaint = useGlobeStore((s) => s.setPaint);
  useEffect(() => {
    const selected = new Set(continents);
    const fills: Record<string, string> = {};
    for (const c of countriesIn([...CONTINENTS])) {
      if (!selected.has(c.continent)) {
        fills[c.code] = colors.landMuted;
        continue;
      }
      const learned = modes.filter((m) => (cards[cardKey(m, c.code)]?.box ?? 0) >= LEARNED_BOX).length;
      if (learned === modes.length) fills[c.code] = colors.learned;
      else if (learned > 0) fills[c.code] = colors.learning;
    }
    setPaint({ fills, outlines: {}, rings: {} });
  }, [cards, modes, continents, setPaint]);
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const wide = useWindowDimensions().width >= 900;
  const settings = useProgress((s) => s.settings);
  const cards = useProgress((s) => s.cards);
  const setModes = useProgress((s) => s.setModes);
  const setContinents = useProgress((s) => s.setContinents);
  useHomePaint(settings.modes, settings.continents);

  useEffect(() => {
    camera.setAutoRotate(true);
    if (camera.getZoom() > 1.5) camera.setZoom(1);
    return () => camera.setAutoRotate(false);
  }, []);

  const now = useNow();
  const stats = useMemo(
    () => Object.fromEntries(MODES.map((m) => [m, statsFor(poolFor([m], settings.continents), cards, now)])),
    [cards, settings.continents, now],
  );
  const total = statsFor(poolFor(settings.modes, settings.continents), cards, now);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(500)} style={styles.header} pointerEvents="box-none">
        <View>
          <Logo />
          <Text variant="label" color="rgba(255,255,255,0.85)">
            {t.home.learned(total.learned, total.total)}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <IconButton icon="stats-chart" label={t.home.progress} onPress={() => router.push('/progress')} />
          <IconButton icon="person" label={t.home.account} onPress={() => router.push('/account')} />
        </View>
      </Animated.View>

      <GlobeSlot style={styles.globe} fill={0.92} />

      <Animated.View
        entering={FadeInDown.springify().damping(15).stiffness(140)}
        style={[styles.bottom, wide && styles.bottomWide, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <GlassPanel style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelContent} bounces={false} showsVerticalScrollIndicator={false}>
            <Text variant="label" color="rgba(255,255,255,0.85)">
              {t.home.learn}
            </Text>
            <View style={styles.chips}>
              {MODES.map((m) => (
                <Chip
                  key={m}
                  testID={`mode-${m}`}
                  icon={MODE_ICONS[m]}
                  label={t.modes[m]}
                  detail={`${stats[m].learned}/${stats[m].total}`}
                  selected={settings.modes.includes(m)}
                  onPress={() => setModes(toggle(settings.modes, m))}
                />
              ))}
            </View>
            <Text variant="label" color="rgba(255,255,255,0.85)" style={styles.sectionGap}>
              {t.home.continentsLabel}
            </Text>
            <View style={styles.chips}>
              {CONTINENTS.map((c) => (
                <Chip
                  key={c}
                  testID={`continent-${c}`}
                  label={t.continents[c]}
                  selected={settings.continents.includes(c)}
                  onPress={() => setContinents(toggle(settings.continents, c))}
                />
              ))}
            </View>
          </ScrollView>
        </GlassPanel>
        <Button
          testID="play"
          title={total.due > 0 ? t.home.playReview(total.due) : t.home.play}
          icon="play"
          onPress={() => router.push('/play')}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20 },
  headerButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  globe: { flex: 1, minHeight: 160 },
  bottom: { paddingHorizontal: 16, gap: 12 },
  bottomWide: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  panel: { maxHeight: 360 },
  panelContent: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionGap: { marginTop: 6 },
});
