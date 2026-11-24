import { Platform, StyleSheet, View } from 'react-native';

import { checkTyped } from '@/domain/answer';
import type { Question } from '@/domain/questions';
import type { Result } from '@/state/session';
import { colors } from '@/theme';
import { Button } from '@/ui/Button';
import { Flag } from '@/ui/Flag';
import { Text } from '@/ui/Text';

import { AnswerInput } from './AnswerInput';
import { FlagChoices } from './FlagChoices';

const HINT = Platform.select({
  web: 'Drag to spin, scroll to zoom, click the country.',
  default: 'Drag to spin, pinch to zoom, tap the country.',
});

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
          <Prompt before="Which is the flag of " strong={country.name} after="?" />
          <FlagChoices
            options={question.options ?? []}
            onPick={(code) => onAnswer({ correct: code === country.code, given: code, givenCountry: code })}
          />
        </View>
      );
    case 'flag-name':
      return (
        <View style={styles.body}>
          <Prompt before="Which country has this flag?" />
          <View style={styles.bigFlag}>
            <Flag code={country.code} width={200} height={120} />
          </View>
          <AnswerInput key={question.key} placeholder="Country" onSubmit={typed('country')} onGiveUp={giveUp} />
        </View>
      );
    case 'capital-of':
      return (
        <View style={styles.body}>
          <View style={styles.row}>
            <Flag code={country.code} width={44} height={30} />
            <Prompt before="What is the capital of " strong={country.name} after="?" />
          </View>
          <AnswerInput key={question.key} placeholder="Capital" onSubmit={typed('capital')} onGiveUp={giveUp} />
        </View>
      );
    case 'capital-country':
      return (
        <View style={styles.body}>
          <Prompt strong={country.capitals[0]} after=" is the capital of…" />
          <AnswerInput key={question.key} placeholder="Country" onSubmit={typed('country')} onGiveUp={giveUp} />
        </View>
      );
    case 'map-name':
      return (
        <View style={styles.body}>
          <Prompt before="Which country is " strong="highlighted" after="?" />
          <AnswerInput key={question.key} placeholder="Country" onSubmit={typed('country')} onGiveUp={giveUp} />
        </View>
      );
    case 'map-locate':
      return (
        <View style={styles.body}>
          <Prompt before="Find " strong={country.name} after=" on the globe" />
          <Text variant="caption" color={colors.inkSoft}>
            {HINT}
          </Text>
          <Button title="I don't know" kind="secondary" size="m" onPress={giveUp} testID="give-up" />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  prompt: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigFlag: { alignItems: 'center' },
});
