import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTINENTS, frameOf, getCountry, type Continent } from '@/domain/countries';
import { isLessonDone, LESSON_STEPS, lessonsFor, type Lesson } from '@/domain/lessons';
import { camera, GlobeCamera } from '@/globe/camera';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { EMPTY_PAINT } from '@/globe/scene';
import { useGlobeStore } from '@/globe/store';
import { useI18n } from '@/i18n';
import { useLessonProgress } from '@/state/lessons';
import { useProgress } from '@/state/progress';
import { colors, radius } from '@/theme';
import { Chip } from '@/ui/Chip';
import { Flag } from '@/ui/Flag';
import { Panel } from '@/ui/Panel';
import { Pressy } from '@/ui/Pressy';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Lessons (docs/specs/lessons.md): each continent's lessons and which steps are done. */
export default function Lessons() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const selected = useProgress((s) => s.settings.continents);
  const [continent, setContinent] = useState<Continent>(selected[0] ?? 'europe');
  const setPaint = useGlobeStore((s) => s.setPaint);
  const lessons = useMemo(() => lessonsFor(continent), [continent]);

  // The globe shows where the continent is; lesson progress isn't painted on it.
  useEffect(() => {
    setPaint(EMPTY_PAINT);
    camera.setAutoRotate(false);
    const { center, radius } = frameOf(lessons.flatMap((l) => l.countries));
    camera.flyTo(center, GlobeCamera.zoomToFit(radius, 0.9, 3));
  }, [lessons, setPaint]);

  return (
    <Screen title={t.lessons.title}>
      <GlobeSlot style={styles.globe} fill={0.9} />
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {CONTINENTS.map((c) => (
            <Chip
              key={c}
              testID={`lessons-${c}`}
              label={t.continents[c]}
              selected={continent === c}
              onPress={() => setContinent(c)}
            />
          ))}
        </ScrollView>
        <Panel style={styles.panel}>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} />
            ))}
          </ScrollView>
        </Panel>
      </View>
    </Screen>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const { t, name } = useI18n();
  const done = useLessonProgress((s) => s.done[lesson.id]);
  const complete = isLessonDone(done);
  const names = lesson.countries.map((code) => name(getCountry(code))).join(', ');
  return (
    <Pressy
      testID={`lesson-${lesson.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${t.lessons.lesson(lesson.number)}${complete ? `, ${t.lessons.done}` : ''}: ${names}`}
      scaleTo={0.97}
      onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
      style={[styles.row, complete && styles.rowDone]}
    >
      <View style={styles.rowHeader}>
        <Text variant="heading" color={colors.ink} style={styles.flex}>
          {t.lessons.lesson(lesson.number)}
        </Text>
        {complete ? (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={14} color={colors.ink} />
            <Text variant="caption" color={colors.ink}>
              {t.lessons.done}
            </Text>
          </View>
        ) : (
          <View style={styles.dots}>
            {LESSON_STEPS.map((s) => (
              <View key={s} style={[styles.dot, done?.includes(s) && styles.dotDone]} />
            ))}
          </View>
        )}
      </View>
      <View style={styles.flags}>
        {lesson.countries.map((code) => (
          <Flag key={code} code={code} width={27} height={18} />
        ))}
      </View>
      <Text variant="caption" color={colors.inkSoft} numberOfLines={2}>
        {names}
      </Text>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  globe: { flex: 1, minHeight: 120 },
  bottom: { paddingHorizontal: 12, gap: 10, maxHeight: '62%' },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
  panel: { flexShrink: 1, padding: 10 },
  list: { gap: 8 },
  row: { gap: 6, padding: 12, borderRadius: radius.m, backgroundColor: '#F3EEFF' },
  rowDone: { backgroundColor: '#E2FBEF' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(42,10,94,0.18)' },
  dotDone: { backgroundColor: colors.correctDeep },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.correct,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
