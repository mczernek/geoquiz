import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';
import { Button } from '@/ui/Button';

/** Text answer with Check and "I don't know". Enter submits. */
export function AnswerInput({
  placeholder,
  onSubmit,
  onGiveUp,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  onGiveUp: () => void;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    if (text.trim()) onSubmit(text);
  };
  return (
    <View style={styles.wrap}>
      <TextInput
        testID="answer-input"
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        autoFocus={Platform.OS === 'web'}
        autoCorrect={false}
        autoCapitalize="words"
        autoComplete="off"
        spellCheck={false}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={submit}
        style={styles.input}
        accessibilityLabel={placeholder}
      />
      <View style={styles.row}>
        <Button title="I don't know" kind="secondary" size="m" onPress={onGiveUp} style={styles.flex} testID="give-up" />
        <Button title="Check" size="m" icon="checkmark" onPress={submit} disabled={!text.trim()} style={styles.flex} testID="check" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  input: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.ink,
    backgroundColor: '#F3EEFF',
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: '#DCCFFF',
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 14, default: 10 }),
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
