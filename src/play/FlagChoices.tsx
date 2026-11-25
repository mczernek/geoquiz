import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { haptics } from '@/haptics';
import { colors, radius } from '@/theme';
import { Flag } from '@/ui/Flag';
import { Pressy } from '@/ui/Pressy';

/** Four flags in a 2 × 2 grid. */
/** How long the picked flag shows green/red before the answer card. */
const FEEDBACK_MS = 550;

export function FlagChoices({
  options,
  correct,
  onPick,
}: {
  options: string[];
  correct: string;
  onPick: (code: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (code: string) => {
    if (picked) return;
    haptics.select();
    setPicked(code);
    setTimeout(() => onPick(code), FEEDBACK_MS);
  };

  // Web: keys 1–4 pick a flag.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < options.length && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        pick(options[i]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <View style={styles.grid}>
      {options.map((code, i) => (
        <Pressy
          key={code}
          testID={`flag-option-${i + 1}`}
          accessibilityRole="button"
          accessibilityLabel={`Flag ${i + 1}`}
          onPress={() => pick(code)}
          disabled={picked !== null}
          style={[
            styles.option,
            picked && code === correct && styles.right,
            picked === code && code !== correct && styles.wrong,
            picked && picked !== code && code !== correct && styles.faded,
          ]}
        >
          <Flag code={code} width={130} height={80} />
        </Pressy>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  option: {
    width: '47%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EEFF',
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: '#DCCFFF',
  },
  right: { borderColor: colors.correct, backgroundColor: '#DFFBF0', borderWidth: 4 },
  wrong: { borderColor: colors.wrong, backgroundColor: '#FFE3E8', borderWidth: 4 },
  faded: { opacity: 0.4 },
});
