import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { countriesIn, getCountry, isTiny, type Country } from '@/domain/countries';
import { cardKey, LEARNED_BOX, MODES, type CardState, type Mode } from '@/domain/scheduler';
import { camera, GlobeCamera } from '@/globe/camera';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { useGlobeStore } from '@/globe/store';
import { EMPTY_PAINT } from '@/globe/scene';
import { haptics } from '@/haptics';
import { countryName, useI18n } from '@/i18n';
import { useProgress } from '@/state/progress';
import { colors, radius } from '@/theme';
import { Flag } from '@/ui/Flag';
import { Pressy } from '@/ui/Pressy';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const MODE_ICONS = { flag: 'flag', capital: 'business', map: 'earth' } as const;

function stateColor(card: CardState | undefined): string {
  if (!card || card.seen === 0) return 'rgba(42,10,94,0.15)';
  return card.box >= LEARNED_BOX ? colors.correctDeep : colors.learning;
}

function Row({
  country,
  cards,
  selected,
  onPress,
}: {
  country: Country;
  cards: Record<string, CardState>;
  selected: boolean;
  onPress: () => void;
}) {
  const { t, name, capitals } = useI18n();
  return (
    <Pressy
      onPress={onPress}
      scaleTo={0.97}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="button"
      accessibilityLabel={t.progress.rowLabel(name(country), capitals(country)[0])}
    >
      <Flag code={country.code} width={44} height={30} />
      <View style={styles.names}>
        <Text variant="label" color={colors.ink} numberOfLines={1}>
          {name(country)}
        </Text>
        <Text variant="caption" color={colors.inkSoft} numberOfLines={1}>
          {capitals(country)[0]}
        </Text>
      </View>
      <View style={styles.badges}>
        {MODES.map((m: Mode) => (
          <View
            key={m}
            style={[styles.badge, { backgroundColor: stateColor(cards[cardKey(m, country.code)]) }]}
            accessibilityLabel={t.progress.badgeLabel(
              t.modes[m],
              (cards[cardKey(m, country.code)]?.box ?? 0) >= LEARNED_BOX,
            )}
          >
            <Ionicons name={MODE_ICONS[m]} size={13} color={colors.white} />
          </View>
        ))}
      </View>
    </Pressy>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useI18n();
  const continents = useProgress((s) => s.settings.continents);
  const cards = useProgress((s) => s.cards);
  const setPaint = useGlobeStore((s) => s.setPaint);
  const [selected, setSelected] = useState<string | null>(null);

  const sections = useMemo(
    () =>
      continents.map((c) => ({
        title: t.continents[c],
        data: countriesIn([c]).sort((a, b) =>
          countryName(a, language).localeCompare(countryName(b, language), language),
        ),
      })),
    [continents, language, t],
  );

  useEffect(() => {
    camera.setAutoRotate(selected === null);
    if (!selected) {
      setPaint(EMPTY_PAINT);
      return;
    }
    const c = getCountry(selected);
    setPaint({
      fills: { [c.code]: colors.target },
      outlines: { [c.code]: colors.target },
      rings: isTiny(c) ? { [c.code]: colors.target } : {},
    });
    camera.flyTo([c.focus[0], c.focus[1]], GlobeCamera.zoomToFit(c.focus[2], 0.3, 8));
  }, [selected, setPaint]);

  useEffect(
    () => () => {
      camera.setAutoRotate(false);
      setPaint(EMPTY_PAINT);
    },
    [setPaint],
  );

  return (
    <Screen title={t.progress.title}>
      <GlobeSlot style={styles.globe} fill={0.9} />
      <View style={styles.legend} pointerEvents="none">
        <View style={[styles.dot, { backgroundColor: colors.correctDeep }]} />
        <Text variant="caption">{t.progress.learned}</Text>
        <View style={[styles.dot, { backgroundColor: colors.learning }]} />
        <Text variant="caption">{t.progress.learning}</Text>
        <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
        <Text variant="caption">{t.progress.new}</Text>
      </View>
      <SectionList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        sections={sections}
        keyExtractor={(c) => c.code}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="heading" style={styles.section}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Row
            country={item}
            cards={cards}
            selected={item.code === selected}
            onPress={() => {
              haptics.select();
              setSelected(item.code === selected ? null : item.code);
            }}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  globe: { height: '34%' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, gap: 6 },
  section: { marginTop: 10, marginBottom: 4, marginLeft: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.m,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowSelected: { borderWidth: 2, borderColor: colors.target },
  names: { flex: 1 },
  badges: { flexDirection: 'row', gap: 4 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
