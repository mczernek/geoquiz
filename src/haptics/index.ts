import { Presets } from 'react-native-pulsar';

import type { Haptics } from './types';

/**
 * Native haptics: Pulsar presets (decision 012), chosen by their character: a coin-drop for a win, a wobble (not an
 * error buzz) for a miss, a level-up rush for a learned card. Calls never throw: haptics are decoration.
 */
const safe = (fn: () => void) => () => {
  try {
    fn();
  } catch {
    // A device without a haptic engine: nothing to play.
  }
};

export const haptics: Haptics = {
  select: safe(() => Presets.flick()),
  press: safe(() => Presets.peck()),
  correct: safe(() => Presets.coinDrop()),
  wrong: safe(() => Presets.wobble()),
  reveal: safe(() => Presets.exhale()),
  override: safe(() => Presets.rebound()),
  learned: safe(() => Presets.ascent()),
  streak: safe(() => Presets.fanfare()),
  bigStreak: safe(() => Presets.triumph()),
  globeTap: safe(() => Presets.ping()),
  globeMiss: safe(() => Presets.thud()),
};
