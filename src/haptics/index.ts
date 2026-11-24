import { Presets } from 'react-native-pulsar';

import type { Haptics } from './types';

/** Native haptics: Pulsar presets (decision 012). Calls never throw: haptics are decoration. */
const safe = (fn: () => void) => () => {
  try {
    fn();
  } catch {
    // A device without a haptic engine: nothing to play.
  }
};

export const haptics: Haptics = {
  select: safe(() => Presets.System.selection()),
  press: safe(() => Presets.System.impactLight()),
  correct: safe(() => Presets.System.notificationSuccess()),
  wrong: safe(() => Presets.System.notificationError()),
  learned: safe(() => Presets.bloom()),
  streak: safe(() => Presets.fanfare()),
  globeTap: safe(() => Presets.System.impactMedium()),
};
