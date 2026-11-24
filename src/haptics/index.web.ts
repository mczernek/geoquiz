import { Presets, Settings } from 'pulsar-haptics';

import type { Haptics } from './types';

// The web fallback plays sounds where the Vibration API is missing (iOS Safari); a quiz shouldn't beep.
Settings.enableSound(false);

const play = (fn: () => Promise<unknown>) => () => {
  if (!Settings.isHapticsAvailable()) return;
  fn().catch(() => {});
};

/** Web haptics: pulsar-haptics (Vibration API), silent where unsupported (decision 012). */
export const haptics: Haptics = {
  select: play(() => Presets.softTap()),
  press: play(() => Presets.softTap()),
  correct: play(() => Presets.doubleTap()),
  wrong: play(() => Presets.reject()),
  learned: play(() => Presets.bounce()),
  streak: play(() => Presets.finale()),
  globeTap: play(() => Presets.tap()),
};
