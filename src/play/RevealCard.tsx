import { StyleSheet, View } from 'react-native';

import { CONTINENT_NAMES, countryByCode } from '@/domain/countries';
import type { Question } from '@/domain/questions';
import type { Result } from '@/state/session';
import { colors, radius } from '@/theme';
import { Button } from '@/ui/Button';
import { Flag } from '@/ui/Flag';
import { Text } from '@/ui/Text';

function verdictText(result: Result): string {
  if (result.correct) return result.typo ? 'Correct! (watch the spelling)' : 'Correct!';
  return result.given === null ? 'Here it is' : 'Not quite';
}

function givenText(question: Question, result: Result): string | null {
  if (result.correct || result.given === null) return null;
  if (question.variant === 'flag-pick') return `That was ${countryByCode(result.given)?.name ?? 'another flag'}.`;
  if (question.variant === 'map-locate') {
    const tapped = result.givenCountry ? countryByCode(result.givenCountry)?.name : null;
    return tapped ? `You tapped ${tapped}.` : 'You tapped the sea.';
  }
  return `You answered “${result.given.trim()}”.`;
}

/** The answer: name, flag and capital, with the verdict (the globe shows where it is). */
export function RevealCard({ question, result, onNext }: { question: Question; result: Result; onNext: () => void }) {
  const { country } = question;
  const tone = result.correct ? colors.correctDeep : colors.wrongDeep;
  const given = givenText(question, result);
  return (
    <View style={styles.body}>
      <View style={[styles.badge, { backgroundColor: result.correct ? colors.correct : colors.wrong }]}>
        <Text variant="label" color={result.correct ? colors.ink : colors.white}>
          {verdictText(result)}
        </Text>
      </View>
      <View style={styles.row}>
        <Flag code={country.code} width={96} height={64} />
        <View style={styles.names}>
          <Text variant="title" color={colors.ink} testID="answer-name">
            {country.name}
          </Text>
          <Text variant="body" color={colors.inkSoft}>
            Capital: {country.capitals.join(', ')}
          </Text>
          <Text variant="caption" color={colors.inkSoft}>
            {CONTINENT_NAMES[country.continent]}
          </Text>
        </View>
      </View>
      {given && (
        <Text variant="body" color={tone}>
          {given}
        </Text>
      )}
      {result.learned && (
        <Text variant="label" color={colors.correctDeep}>
          ★ Learned! It will come back for review later.
        </Text>
      )}
      <Button title="Next" icon="arrow-forward" onPress={onNext} testID="next" />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  names: { flex: 1, gap: 2 },
});
