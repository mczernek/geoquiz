import { Platform, StyleSheet, View } from 'react-native';

import { checkTyped } from '@/domain/answer';
import type { Question } from '@/domain/questions';
import { useI18n } from '@/i18n';
import type { Result } from '@/state/session';
import { colors } from '@/theme';
import { Button } from '@/ui/Button';
import { Flag } from '@/ui/Flag';
import { Text } from '@/ui/Text';

import { AnswerInput } from './AnswerInput';
import { FlagChoices } from './FlagChoices';

type Answer = (result: Omit<Result, 'learned'>) => void;

function Prompt({ before, strong, after }: { before?: string; strong?: string; after?: string }) {
  return (
    <Text variant="heading" color={colors.ink} style={styles.prompt}>
      {before}
      {strong ? (
        <Text variant="heading" color={colors.target}>
          {strong}
        </Text>
      ) : null}
      {after}
    </Text>
  );
}

/** The question and its answer controls, by variant (docs/specs/learning.md → Questions). */
export function QuestionCard({ question, onAnswer }: { question: Question; onAnswer: Answer }) {
  const { country, variant } = question;
  const { t, name, capitals } = useI18n();
  const typed = (kind: 'country' | 'capital') => (text: string) => {
    const verdict = checkTyped(text, country, kind);
    onAnswer(
      verdict.correct
        ? { correct: true, given: text, typo: !verdict.exact }
        : { correct: false, given: text, givenCountry: kind === 'country' ? verdict.matched : undefined },
    );
  };
  const giveUp = () => onAnswer({ correct: false, given: null });

  switch (variant) {
    case 'flag-pick':
      return (
        <View style={styles.body}>
          <Prompt {...t.play.flagPick(name(country))} />
          <FlagChoices
            key={question.key}
            correct={country.code}
            options={question.options ?? []}
            onPick={(code) => onAnswer({ correct: code === country.code, given: code, givenCountry: code })}
          />
          <Button
            title={t.play.dontKnow}
            kind="secondary"
            size="m"
            onPress={giveUp}
            testID="give-up"
            style={styles.outlined}
          />
        </View>
      );
    case 'flag-name':
      return (
        <View style={styles.body}>
          <Prompt before={t.play.flagName} />
          <View style={styles.bigFlag}>
            <Flag code={country.code} width={200} height={120} />
          </View>
          <AnswerInput
            key={question.key}
            placeholder={t.play.countryPlaceholder}
            onSubmit={typed('country')}
            onGiveUp={giveUp}
          />
        </View>
      );
    case 'capital-of':
      return (
        <View style={styles.body}>
          <View style={styles.row}>
            <Flag code={country.code} width={44} height={30} />
            <Prompt {...t.play.capitalOf(name(country))} />
          </View>
          <AnswerInput
            key={question.key}
            placeholder={t.play.capitalPlaceholder}
            onSubmit={typed('capital')}
            onGiveUp={giveUp}
          />
        </View>
      );
    case 'capital-country':
      return (
        <View style={styles.body}>
          <Prompt {...t.play.capitalCountry(capitals(country)[0])} />
          <AnswerInput
            key={question.key}
            placeholder={t.play.countryPlaceholder}
            onSubmit={typed('country')}
            onGiveUp={giveUp}
          />
        </View>
      );
    case 'map-name':
      return (
        <View style={styles.body}>
          <Prompt {...t.play.mapName} />
          <AnswerInput
            key={question.key}
            placeholder={t.play.countryPlaceholder}
            onSubmit={typed('country')}
            onGiveUp={giveUp}
          />
        </View>
      );
    case 'map-locate':
      return (
        <View style={styles.body}>
          <Prompt {...t.play.mapLocate(name(country))} />
          <Text variant="caption" color={colors.inkSoft}>
            {Platform.OS === 'web' ? t.play.hintWeb : t.play.hintTouch}
          </Text>
          <Button
            title={t.play.dontKnow}
            kind="secondary"
            size="m"
            onPress={giveUp}
            testID="give-up"
            style={styles.outlined}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  prompt: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigFlag: { alignItems: 'center' },
  outlined: { borderColor: '#DCCFFF' },
});
