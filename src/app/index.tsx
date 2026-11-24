import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTINENT_NAMES, CONTINENTS, countriesIn, type Continent } from '@/domain/countries';
import { cardKey, LEARNED_BOX, MODE_NAMES, MODES, statsFor, type Mode } from '@/domain/scheduler';
import { camera } from '@/globe/camera';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { useGlobeStore } from '@/globe/store';
import { poolFor, useProgress } from '@/state/progress';
import { colors } from '@/theme';
import { Button, IconButton } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { GlassPanel } from '@/ui/Panel';
import { Text } from '@/ui/Text';

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

  const now = Date.now();
  const stats = useMemo(
    () => Object.fromEntries(MODES.map((m) => [m, statsFor(poolFor([m], settings.continents), cards, now)])),
    // `now` only matters for "due"; recomputing when cards change is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, settings.continents],
  );
  const total = statsFor(poolFor(settings.modes, settings.continents), cards, now);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.header} pointerEvents="box-none">
        <View>
          <Text variant="display">GeoQuiz</Text>
          <Text variant="label" color="rgba(255,255,255,0.85)">
            {total.learned} of {total.total} learned
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <IconButton icon="stats-chart" label="Progress" onPress={() => router.push('/progress')} />
          <IconButton icon="person" label="Account" onPress={() => router.push('/account')} />
        </View>
      </View>

      <GlobeSlot style={styles.globe} fill={0.92} />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <GlassPanel style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelContent} bounces={false} showsVerticalScrollIndicator={false}>
            <Text variant="label" color="rgba(255,255,255,0.85)">
              Learn
            </Text>
            <View style={styles.chips}>
              {MODES.map((m) => (
                <Chip
                  key={m}
                  testID={`mode-${m}`}
                  icon={MODE_ICONS[m]}
                  label={MODE_NAMES[m]}
                  detail={`${stats[m].learned}/${stats[m].total}`}
                  selected={settings.modes.includes(m)}
                  onPress={() => setModes(toggle(settings.modes, m))}
                />
              ))}
            </View>
            <Text variant="label" color="rgba(255,255,255,0.85)" style={styles.sectionGap}>
              Continents
            </Text>
            <View style={styles.chips}>
              {CONTINENTS.map((c) => (
                <Chip
                  key={c}
                  testID={`continent-${c}`}
                  label={CONTINENT_NAMES[c]}
                  selected={settings.continents.includes(c)}
                  onPress={() => setContinents(toggle(settings.continents, c))}
                />
              ))}
            </View>
          </ScrollView>
        </GlassPanel>
        <Button
          testID="play"
          title={total.due > 0 ? `Play · ${total.due} to review` : 'Play'}
          icon="play"
          onPress={() => router.push('/play')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20 },
  headerButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  globe: { flex: 1, minHeight: 160 },
  bottom: { paddingHorizontal: 16, gap: 12 },
  panel: { maxHeight: 300 },
  panelContent: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionGap: { marginTop: 6 },
});
