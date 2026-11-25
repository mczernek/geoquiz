import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCountry, isTiny, type Country } from '@/domain/countries';
import { cardKey, LEARNED_BOX, MODES } from '@/domain/scheduler';
import { searchCountries } from '@/domain/search';
import { camera, GlobeCamera } from '@/globe/camera';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { EMPTY_PAINT } from '@/globe/scene';
import { useGlobeStore, type TapHandler } from '@/globe/store';
import { haptics } from '@/haptics';
import { useI18n } from '@/i18n';
import { useProgress } from '@/state/progress';
import { colors, fonts, radius } from '@/theme';
import { Flag } from '@/ui/Flag';
import { Panel } from '@/ui/Panel';
import { Pressy } from '@/ui/Pressy';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Explore (docs/specs/explore.md): tap any country, or search one, to see its flag, capital and continent. */
export default function Explore() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const setPaint = useGlobeStore((s) => s.setPaint);
  const setOnTap = useGlobeStore((s) => s.setOnTap);

  const onTap: TapHandler = useCallback((code) => {
    if (code) haptics.globeTap();
    else haptics.globeMiss();
    setSelected(code);
  }, []);

  useEffect(() => {
    camera.setAutoRotate(false);
    setOnTap(onTap);
    return () => {
      setOnTap(null);
      setPaint(EMPTY_PAINT);
    };
  }, [onTap, setOnTap, setPaint]);

  useEffect(() => {
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
  }, [selected, setPaint]);

  // A search result may be anywhere: fly there. A tapped country is already in view, so the camera stays put.
  const pick = (c: Country) => {
    haptics.select();
    setQuery('');
    setSelected(c.code);
    camera.flyTo([c.focus[0], c.focus[1]], GlobeCamera.zoomToFit(c.focus[2], 0.25, 5));
  };

  const results = searchCountries(query, 5);

  return (
    <Screen title={t.explore.title}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <GlobeSlot style={styles.flex} fill={0.92} />
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
          <Panel style={styles.panel}>
            {query ? (
              <Results results={results} onPick={pick} empty={t.explore.noResults} />
            ) : selected ? (
              <CountryInfo key={selected} country={getCountry(selected)} />
            ) : (
              <Text variant="body" color={colors.inkSoft}>
                {Platform.OS === 'web' ? t.explore.hintWeb : t.explore.hintTouch}
              </Text>
            )}
            <TextInput
              testID="explore-search"
              value={query}
              onChangeText={setQuery}
              placeholder={t.explore.search}
              placeholderTextColor={colors.inkSoft}
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              returnKeyType="search"
              onSubmitEditing={() => results[0] && pick(results[0])}
              style={styles.input}
              accessibilityLabel={t.explore.search}
            />
          </Panel>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Results({ results, onPick, empty }: { results: Country[]; onPick: (c: Country) => void; empty: string }) {
  const { name, capitals } = useI18n();
  if (!results.length) {
    return (
      <Text variant="body" color={colors.inkSoft}>
        {empty}
      </Text>
    );
  }
  return (
    <View style={styles.results}>
      {results.map((c) => (
        <Pressy
          key={c.code}
          onPress={() => onPick(c)}
          scaleTo={0.97}
          style={styles.result}
          accessibilityRole="button"
          testID={`result-${c.code}`}
        >
          <Flag code={c.code} width={36} height={24} />
          <Text variant="label" color={colors.ink} style={styles.flex} numberOfLines={1}>
            {name(c)}
          </Text>
          <Text variant="caption" color={colors.inkSoft} numberOfLines={1}>
            {capitals(c)[0]}
          </Text>
        </Pressy>
      ))}
    </View>
  );
}

function CountryInfo({ country }: { country: Country }) {
  const { t, name, capitals } = useI18n();
  const cards = useProgress((s) => s.cards);
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.info} testID="explore-info">
      <View style={styles.row}>
        <Flag code={country.code} width={96} height={64} />
        <View style={styles.flex}>
          <Text variant="title" color={colors.ink} testID="explore-name">
            {name(country)}
          </Text>
          <Text variant="body" color={colors.inkSoft}>
            {t.play.capital(capitals(country).join(', '))}
          </Text>
          <Text variant="caption" color={colors.inkSoft}>
            {t.continents[country.continent]}
          </Text>
        </View>
      </View>
      <View style={styles.badges}>
        {MODES.map((m) => {
          const card = cards[cardKey(m, country.code)];
          const state = !card?.seen ? 'new' : card.box >= LEARNED_BOX ? 'learned' : 'learning';
          const color = { new: 'rgba(42,10,94,0.25)', learning: colors.learning, learned: colors.correctDeep }[state];
          return (
            <View key={m} style={styles.badge}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text variant="caption" color={colors.inkSoft}>
                {t.modes[m]}: {t.progress[state]}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bottom: { paddingHorizontal: 12 },
  panel: { gap: 14 },
  info: { gap: 12 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  results: { gap: 4 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.s,
    backgroundColor: '#F3EEFF',
  },
  input: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: '#F3EEFF',
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: '#DCCFFF',
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, default: 8 }),
  },
});
