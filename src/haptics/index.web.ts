import { Presets, Settings } from 'pulsar-haptics';

import type { Haptics } from './types';

// The web fallback plays sounds where the Vibration API is missing (iOS Safari); a quiz shouldn't beep.
Settings.enableSound(false);

const play = (fn: () => Promise<unknown>) => () => {
  if (!Settings.isHapticsAvailable()) return;
  fn().catch(() => {});
};

/** Web haptics: pulsar-haptics (Vibration API), the closest web presets to the native ones (decision 012). */
export const haptics: Haptics = {
  select: play(() => Presets.softTap()),
  press: play(() => Presets.softTap()),
  correct: play(() => Presets.bounce()),
  wrong: play(() => Presets.deflate()),
  reveal: play(() => Presets.unwind()),
  override: play(() => Presets.connect()),
  learned: play(() => Presets.skip()),
  streak: play(() => Presets.knockout()),
  bigStreak: play(() => Presets.finale()),
  globeTap: play(() => Presets.tap()),
  globeMiss: play(() => Presets.softTap()),
};
