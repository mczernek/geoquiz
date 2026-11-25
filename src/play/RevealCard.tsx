import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { countryByCode } from '@/domain/countries';
import type { Question } from '@/domain/questions';
import { useI18n } from '@/i18n';
import type { Result } from '@/state/session';
import { colors, radius } from '@/theme';
import { Button } from '@/ui/Button';
import { Flag } from '@/ui/Flag';
import { Text } from '@/ui/Text';

type I18n = ReturnType<typeof useI18n>;

function verdictText(result: Result, { t }: I18n): string {
  if (result.correct) return result.typo ? t.play.correctTypo : t.play.correct;
  return result.given === null ? t.play.reveal : t.play.wrong;
}

function givenText(question: Question, result: Result, { t, name }: I18n): string | null {
  if (result.correct || result.given === null) return null;
  const other = (code: string | undefined) => {
    const c = code ? countryByCode(code) : undefined;
    return c ? name(c) : null;
  };
  if (question.variant === 'flag-pick') return t.play.pickedFlag(other(result.given) ?? '?');
  if (question.variant === 'map-locate') {
    const tapped = other(result.givenCountry);
    return tapped ? t.play.tapped(tapped) : t.play.tappedSea;
  }
  return t.play.answered(result.given.trim());
}

/** The answer: name, flag and capital, with the verdict (the globe shows where it is). */
export function RevealCard({ question, result, onNext }: { question: Question; result: Result; onNext: () => void }) {
  const { country } = question;
  const i18n = useI18n();
  const { t } = i18n;
  const tone = result.correct ? colors.correctDeep : colors.wrongDeep;
  const given = givenText(question, result, i18n);
  return (
    <View style={styles.body}>
      <View style={[styles.badge, { backgroundColor: result.correct ? colors.correct : colors.wrong }]}>
        <Text variant="label" color={result.correct ? colors.ink : colors.white}>
          {verdictText(result, i18n)}
        </Text>
      </View>
      <View style={styles.row}>
        <Flag code={country.code} width={96} height={64} />
        <View style={styles.names}>
          <Text variant="title" color={colors.ink} testID="answer-name">
            {i18n.name(country)}
          </Text>
          <Text variant="body" color={colors.inkSoft}>
            {t.play.capital(i18n.capitals(country).join(', '))}
          </Text>
          <Text variant="caption" color={colors.inkSoft}>
            {t.continents[country.continent]}
          </Text>
        </View>
      </View>
      {given && (
        <Text variant="body" color={tone}>
          {given}
        </Text>
      )}
      {result.learned && (
        <Animated.View entering={ZoomIn.delay(350).springify().damping(8).stiffness(220)} style={styles.learned}>
          <Text variant="label" color={colors.ink}>
            {t.play.learnedBadge}
          </Text>
        </Animated.View>
      )}
      <Button title={t.play.next} icon="arrow-forward" onPress={onNext} testID="next" />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  names: { flex: 1, gap: 2 },
  learned: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
