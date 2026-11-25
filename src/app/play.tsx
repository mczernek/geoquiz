import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseCardKey } from '@/domain/scheduler';
import { GlobeSlot } from '@/globe/GlobeSlot';
import type { TapHandler } from '@/globe/store';
import { haptics } from '@/haptics';
import { useI18n } from '@/i18n';
import { AnimatedCard } from '@/play/AnimatedCard';
import { Bump } from '@/play/Bump';
import { Celebration, Miss } from '@/play/Celebration';
import { QuestionCard } from '@/play/QuestionCard';
import { RevealCard } from '@/play/RevealCard';
import { StreakToast } from '@/play/StreakToast';
import { useQuestionGlobe } from '@/play/useQuestionGlobe';
import { useProgress } from '@/state/progress';
import { useSession, type Result } from '@/state/session';
import { colors } from '@/theme';
import { IconButton } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Text } from '@/ui/Text';

/** The haptic for a right answer, then a bigger one for a streak milestone or a newly learned card. */
function celebrate(result: Result, first: () => void) {
  first();
  const { streak } = useSession.getState();
  if (streak > 0 && streak % 10 === 0) setTimeout(haptics.bigStreak, 280);
  else if (streak > 0 && streak % 5 === 0) setTimeout(haptics.streak, 280);
  else if (result.learned) setTimeout(haptics.learned, 280);
}

export default function Play() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  // Wide screens (desktop web, tablets in landscape): globe on the left, card on the right.
  const wide = useWindowDimensions().width >= 900;
  const continents = useProgress((s) => s.settings.continents);
  const { question, result, streak, answered, correct, start, next, answer, override } = useSession();

  useEffect(() => {
    start();
  }, [start]);

  const submit = useCallback(
    (partial: Omit<Result, 'learned'>) => {
      const full = answer(partial);
      if (full.correct) celebrate(full, haptics.correct);
      else if (full.given === null) haptics.reveal();
      else haptics.wrong();
    },
    [answer],
  );

  const claimRight = useCallback(() => {
    const full = override();
    if (full) celebrate(full, haptics.override);
  }, [override]);

  const onTap: TapHandler = useCallback(
    (code) => {
      const q = useSession.getState().question;
      if (!q || useSession.getState().result) return;
      if (code) haptics.globeTap();
      else haptics.globeMiss();
      submit({ correct: code === q.country.code, given: code ?? '', givenCountry: code ?? undefined });
    },
    [submit],
  );

  // Where the camera arrived at the answer; tied to the answer it belongs to, so it disappears with it.
  const [arrival, setArrival] = useState<{ x: number; y: number; correct: boolean; answer: number } | null>(null);
  const onArrive = useCallback(
    (x: number, y: number, ok: boolean) => setArrival({ x, y, correct: ok, answer: useSession.getState().answered }),
    [],
  );
  const burst = result && arrival?.answer === answered ? arrival : null;

  useQuestionGlobe(question, result, continents, onTap, onArrive);

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
      style={[styles.screen, wide && styles.screenWide, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      pointerEvents="box-none"
    >
      <View style={styles.header} pointerEvents="box-none">
        <IconButton
          icon="close"
          label={t.play.stop}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <View style={styles.stats} pointerEvents="none">
          {mode && (
            <Text variant="label" color="rgba(255,255,255,0.9)">
              {t.modes[mode]}
            </Text>
          )}
          <Bump value={correct}>
            <Text variant="label" testID="score">
              {correct}/{answered}
            </Text>
          </Bump>
          <Bump value={streak} strength={1.35}>
            <Text variant="label" color={streak >= 3 ? colors.accent : colors.white}>
              🔥 {streak}
            </Text>
          </Bump>
        </View>
      </View>

      <View style={[styles.body, wide && styles.bodyWide]} pointerEvents="box-none">
        <GlobeSlot style={styles.globe} fill={0.94} />
        {burst?.correct && <Celebration x={burst.x} y={burst.y} burst={burst.answer} />}
        {burst && !burst.correct && <Miss x={burst.x} y={burst.y} burst={burst.answer} />}
        <StreakToast streak={streak} />

        <View style={[styles.bottom, wide && styles.bottomWide, { paddingBottom: insets.bottom + 12 }]}>
          <Panel style={styles.panel}>
            {!question ? (
              <Text variant="heading" color={colors.ink}>
                {t.play.empty}
              </Text>
            ) : result ? (
              <AnimatedCard
                key={`a${question.key}${answered}${result.correct}`}
                phase={result.correct ? 'correct' : 'wrong'}
              >
                <RevealCard question={question} result={result} onNext={next} onOverride={claimRight} />
              </AnimatedCard>
            ) : (
              <AnimatedCard key={`q${question.key}${answered}`} phase="question">
                <QuestionCard question={question} onAnswer={submit} />
              </AnimatedCard>
            )}
          </Panel>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  screenWide: { maxWidth: 1400 },
  body: { flex: 1 },
  bodyWide: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  stats: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: colors.scrim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  globe: { flex: 1, minHeight: 120, alignSelf: 'stretch' },
  bottom: { paddingHorizontal: 12 },
  bottomWide: { width: 440, paddingHorizontal: 0 },
  panel: {},
});
