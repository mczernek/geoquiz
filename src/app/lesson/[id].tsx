import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frameOf, getCountry, isTiny } from '@/domain/countries';
import {
  firstOpenStep,
  isLessonDone,
  LESSON_STEPS,
  lessonById,
  nextLesson,
  QUIZ_STEPS,
  type Lesson,
  type LessonStep,
} from '@/domain/lessons';
import { camera, GlobeCamera } from '@/globe/camera';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { EMPTY_PAINT } from '@/globe/scene';
import { useGlobeStore, type TapHandler } from '@/globe/store';
import { haptics } from '@/haptics';
import { useI18n } from '@/i18n';
import { AnimatedCard } from '@/play/AnimatedCard';
import { Celebration, Miss } from '@/play/Celebration';
import { QuestionCard } from '@/play/QuestionCard';
import { RevealCard } from '@/play/RevealCard';
import { useQuestionGlobe } from '@/play/useQuestionGlobe';
import { useLessonProgress, useLessonRun } from '@/state/lessons';
import type { Result } from '@/state/session';
import { colors } from '@/theme';
import { Button, IconButton } from '@/ui/Button';
import { Flag } from '@/ui/Flag';
import { Panel } from '@/ui/Panel';
import { Pressy } from '@/ui/Pressy';
import { goBack } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const STEP_ICONS = {
  meet: 'eye',
  capitals: 'business',
  map: 'earth',
  flag: 'flag',
  capital: 'create',
} as const satisfies Record<LessonStep, string>;

function celebrate(result: Result, first: () => void) {
  first();
  if (result.learned) setTimeout(haptics.learned, 280);
}

/** A lesson (docs/specs/lessons.md): five steps over the same ten or so countries. */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = lessonById(id);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const wide = useWindowDimensions().width >= 900;
  const { step, index, question, result, finished, queue, round, start, next, answer, override } = useLessonRun();
  const done = useLessonProgress((s) => s.done[id]);

  useEffect(() => {
    start(id, firstOpenStep(useLessonProgress.getState().done[id]));
  }, [id, start]);

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
      const { question: q, result: r } = useLessonRun.getState();
      if (!q || r) return;
      if (code) haptics.globeTap();
      else haptics.globeMiss();
      submit({ correct: code === q.country.code, given: code ?? '', givenCountry: code ?? undefined });
    },
    [submit],
  );

  const forward = useCallback(() => {
    next();
    const run = useLessonRun.getState();
    if (!run.finished || !run.lesson) return;
    if (isLessonDone(useLessonProgress.getState().done[run.lesson.id])) haptics.bigStreak();
    else haptics.streak();
  }, [next]);

  // Where the camera arrived at the answer; tied to the question it belongs to, so it disappears with it.
  const [arrival, setArrival] = useState<{ x: number; y: number; correct: boolean; round: number } | null>(null);
  const onArrive = useCallback(
    (x: number, y: number, ok: boolean) => setArrival({ x, y, correct: ok, round: useLessonRun.getState().round }),
    [],
  );
  const burst = result && arrival?.round === round ? arrival : null;

  const continents = useMemo(() => (lesson ? [lesson.continent] : []), [lesson]);
  useQuestionGlobe(question, result, continents, onTap, onArrive);
  useShowGlobe(lesson, QUIZ_STEPS[step] ? null : index, finished);

  // Web: Enter moves on wherever there's nothing to type.
  const waiting = !finished && (!QUIZ_STEPS[step] || !!result);
  useEffect(() => {
    if (Platform.OS !== 'web' || !waiting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        forward();
      }
    };
    const timer = setTimeout(() => window.addEventListener('keydown', onKey), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [waiting, forward, index, round]);

  if (!lesson) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="close" label={t.play.stop} onPress={goBack} />
      </View>
    );
  }

  const quiz = !!QUIZ_STEPS[step];
  const count = lesson.countries.length;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, wide && styles.screenWide, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      pointerEvents="box-none"
    >
      <View style={styles.header} pointerEvents="box-none">
        <IconButton icon="close" label={t.play.stop} onPress={goBack} />
        <View style={styles.titlePill} pointerEvents="none">
          <Text variant="label" numberOfLines={1}>
            {t.lessons.heading(t.continents[lesson.continent], lesson.number)}
          </Text>
        </View>
      </View>
      {/* On a scrim: a zoomed-in globe puts yellow land behind the header. */}
      <View style={styles.steps}>
        {LESSON_STEPS.map((s) => {
          const current = s === step;
          const complete = done?.includes(s);
          return (
            <Pressy
              key={s}
              testID={`step-${s}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: current }}
              accessibilityLabel={t.lessons.steps[s]}
              onPress={() => {
                haptics.select();
                start(lesson.id, s);
              }}
              style={[styles.step, complete && styles.stepDone, current && styles.stepCurrent]}
            >
              <Ionicons
                name={complete && !current ? 'checkmark' : STEP_ICONS[s]}
                size={18}
                color={current ? colors.ink : colors.white}
              />
            </Pressy>
          );
        })}
      </View>

      <View style={[styles.body, wide && styles.bodyWide]} pointerEvents="box-none">
        <GlobeSlot style={styles.globe} fill={0.94} />
        {burst?.correct && <Celebration x={burst.x} y={burst.y} burst={burst.round} />}
        {burst && !burst.correct && <Miss x={burst.x} y={burst.y} burst={burst.round} />}

        <View style={[styles.bottom, wide && styles.bottomWide, { paddingBottom: insets.bottom + 12 }]}>
          <Panel style={styles.panel}>
            <View style={styles.stepLine}>
              <Text variant="label" color={colors.inkSoft} style={styles.flex}>
                {t.lessons.steps[step]}
              </Text>
              {!finished && (
                <Text variant="caption" color={colors.inkSoft} testID="lesson-count">
                  {quiz ? t.lessons.left(queue.length) : t.lessons.of(index + 1, count)}
                </Text>
              )}
            </View>
            {finished ? (
              <Finished lesson={lesson} step={step} onStep={(s) => start(lesson.id, s)} />
            ) : !quiz ? (
              <AnimatedCard key={`${step}${index}`} phase="question">
                <ShowCard code={lesson.countries[index]} step={step} first={index === 0} onNext={forward} />
              </AnimatedCard>
            ) : question && result ? (
              <AnimatedCard key={`a${round}${result.correct}`} phase={result.correct ? 'correct' : 'wrong'}>
                <RevealCard question={question} result={result} onNext={forward} onOverride={claimRight} />
              </AnimatedCard>
            ) : question ? (
              <AnimatedCard key={`q${round}`} phase="question">
                <QuestionCard question={question} onAnswer={submit} />
              </AnimatedCard>
            ) : null}
          </Panel>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** The first two steps: one country at a time, with its capital in the second. */
function ShowCard({
  code,
  step,
  first,
  onNext,
}: {
  code: string;
  step: LessonStep;
  first: boolean;
  onNext: () => void;
}) {
  const { t, name, capitals } = useI18n();
  const country = getCountry(code);
  return (
    <View style={styles.card}>
      {first && (
        <Text variant="body" color={colors.inkSoft}>
          {t.lessons.stepIntro[step]}
        </Text>
      )}
      <View style={styles.row}>
        <Flag code={code} width={96} height={64} />
        <View style={styles.flex}>
          <Text variant="title" color={colors.ink} testID="lesson-country">
            {name(country)}
          </Text>
          {step === 'capitals' && (
            <Text variant="heading" color={colors.target} testID="lesson-capital">
              {capitals(country).join(', ')}
            </Text>
          )}
        </View>
      </View>
      <Button title={t.play.next} icon="arrow-forward" onPress={onNext} testID="next" />
    </View>
  );
}

function Finished({ lesson, step, onStep }: { lesson: Lesson; step: LessonStep; onStep: (step: LessonStep) => void }) {
  const { t } = useI18n();
  const done = useLessonProgress((s) => s.done[lesson.id]);
  const after = LESSON_STEPS.slice(LESSON_STEPS.indexOf(step) + 1).find((s) => !done?.includes(s));
  const following = nextLesson(lesson.id);

  if (!isLessonDone(done) || after) {
    const upcoming = after ?? firstOpenStep(done);
    return (
      <Animated.View entering={FadeIn.duration(240)} style={styles.card}>
        <Text variant="title" color={colors.ink}>
          {t.lessons.stepDone}
        </Text>
        <Button
          title={t.lessons.continueTo(t.lessons.steps[upcoming])}
          icon="arrow-forward"
          onPress={() => onStep(upcoming)}
          testID="continue"
        />
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.card} testID="lesson-done">
      <Text variant="title" color={colors.ink}>
        {t.lessons.lessonDone}
      </Text>
      <Text variant="body" color={colors.inkSoft}>
        {t.lessons.lessonDoneBody}
      </Text>
      <View style={styles.flags}>
        {lesson.countries.map((code) => (
          <Flag key={code} code={code} width={33} height={22} />
        ))}
      </View>
      {following && (
        <Button
          title={`${t.lessons.nextLesson}: ${t.lessons.heading(t.continents[following.continent], following.number)}`}
          icon="arrow-forward"
          onPress={() => router.replace({ pathname: '/lesson/[id]', params: { id: following.id } })}
          testID="next-lesson"
        />
      )}
      <Button
        title={t.lessons.allLessons}
        kind="secondary"
        size="m"
        icon="list"
        onPress={goBack}
        style={styles.outlined}
      />
    </Animated.View>
  );
}

/**
 * The globe in the showing steps: the current country highlighted and in view. At the end of a step the whole
 * lesson is framed, its countries outlined (where they are, not how well they're known).
 */
function useShowGlobe(lesson: Lesson | undefined, index: number | null, finished: boolean) {
  const setPaint = useGlobeStore((s) => s.setPaint);
  useEffect(() => {
    if (!lesson) return;
    if (finished) {
      camera.setAutoRotate(false);
      const outlines = Object.fromEntries(lesson.countries.map((c) => [c, colors.target]));
      setPaint({ fills: {}, outlines, rings: {} });
      const { center, radius } = frameOf(lesson.countries);
      camera.flyTo(center, GlobeCamera.zoomToFit(radius, 0.8, 5));
      return;
    }
    if (index === null) return;
    const country = getCountry(lesson.countries[index]);
    camera.setAutoRotate(false);
    setPaint({
      fills: { [country.code]: colors.target },
      outlines: { [country.code]: colors.target },
      rings: isTiny(country) ? { [country.code]: colors.target } : {},
    });
    camera.flyTo([country.focus[0], country.focus[1]], GlobeCamera.zoomToFit(country.focus[2], 0.25, 5));
  }, [lesson, index, finished, setPaint]);
  useEffect(() => () => setPaint(EMPTY_PAINT), [setPaint]);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  screenWide: { maxWidth: 1400 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  titlePill: {
    flexShrink: 1,
    backgroundColor: colors.scrim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  steps: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    marginTop: 10,
    padding: 6,
    backgroundColor: colors.scrim,
    borderRadius: 999,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  stepDone: { backgroundColor: colors.correctDeep, borderColor: colors.correct },
  stepCurrent: { backgroundColor: colors.white, borderColor: colors.white },
  body: { flex: 1 },
  bodyWide: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 24 },
  globe: { flex: 1, minHeight: 120, alignSelf: 'stretch' },
  bottom: { paddingHorizontal: 12 },
  bottomWide: { width: 440, paddingHorizontal: 0 },
  panel: { gap: 10 },
  stepLine: { flexDirection: 'row', alignItems: 'center' },
  card: { gap: 14 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  outlined: { borderColor: '#DCCFFF' },
});
