import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODE_NAMES, parseCardKey } from '@/domain/scheduler';
import { GlobeSlot } from '@/globe/GlobeSlot';
import type { TapHandler } from '@/globe/store';
import { haptics } from '@/haptics';
import { QuestionCard } from '@/play/QuestionCard';
import { RevealCard } from '@/play/RevealCard';
import { useQuestionGlobe } from '@/play/useQuestionGlobe';
import { useProgress } from '@/state/progress';
import { useSession, type Result } from '@/state/session';
import { colors } from '@/theme';
import { IconButton } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Text } from '@/ui/Text';

export default function Play() {
  const insets = useSafeAreaInsets();
  const continents = useProgress((s) => s.settings.continents);
  const { question, result, streak, answered, correct, start, next, answer } = useSession();

  useEffect(() => {
    start();
  }, [start]);

  const submit = useCallback(
    (partial: Omit<Result, 'learned'>) => {
      const full = answer(partial);
      if (full.correct) {
        haptics.correct();
        const { streak: s } = useSession.getState();
        if (s > 0 && s % 5 === 0) setTimeout(haptics.streak, 250);
        else if (full.learned) setTimeout(haptics.learned, 250);
      } else haptics.wrong();
    },
    [answer],
  );

  const onTap: TapHandler = useCallback(
    (code) => {
      const q = useSession.getState().question;
      if (!q || useSession.getState().result) return;
      haptics.globeTap();
      submit({ correct: code === q.country.code, given: code ?? '', givenCountry: code ?? undefined });
    },
    [submit],
  );

  useQuestionGlobe(question, result, continents, onTap);

  // Web: Enter moves on after an answer.
  useEffect(() => {
    if (Platform.OS !== 'web' || !result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    const id = setTimeout(() => window.addEventListener('keydown', onKey), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [result, next]);

  const mode = question ? parseCardKey(question.key)?.mode : undefined;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      pointerEvents="box-none"
    >
      <View style={styles.header} pointerEvents="box-none">
        <IconButton icon="close" label="Stop" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.stats} pointerEvents="none">
          {mode && (
            <Text variant="label" color="rgba(255,255,255,0.9)">
              {MODE_NAMES[mode]}
            </Text>
          )}
          <Text variant="label" testID="score">
            {correct}/{answered}
          </Text>
          <Text variant="label" color={streak >= 3 ? colors.accent : colors.white}>
            🔥 {streak}
          </Text>
        </View>
      </View>

      <GlobeSlot style={styles.globe} fill={0.94} />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Panel style={styles.panel}>
          {!question ? (
            <Text variant="heading" color={colors.ink}>
              Pick at least one continent and topic on the home screen.
            </Text>
          ) : result ? (
            <RevealCard question={question} result={result} onNext={next} />
          ) : (
            <QuestionCard question={question} onAnswer={submit} />
          )}
        </Panel>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  stats: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  globe: { flex: 1, minHeight: 120 },
  bottom: { paddingHorizontal: 12 },
  panel: {},
});
