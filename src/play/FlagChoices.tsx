import { StyleSheet, View } from 'react-native';

import { haptics } from '@/haptics';
import { colors, radius } from '@/theme';
import { Flag } from '@/ui/Flag';
import { Pressy } from '@/ui/Pressy';

/** Four flags in a 2 × 2 grid. */
export function FlagChoices({ options, onPick }: { options: string[]; onPick: (code: string) => void }) {
  return (
    <View style={styles.grid}>
      {options.map((code, i) => (
        <Pressy
          key={code}
          testID={`flag-option-${i + 1}`}
          accessibilityRole="button"
          accessibilityLabel={`Flag ${i + 1}`}
          onPress={() => {
            haptics.select();
            onPick(code);
          }}
          style={styles.option}
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
});
