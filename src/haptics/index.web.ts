import { Presets, Settings } from 'pulsar-haptics';

import { whenEnabled } from './settings';
import type { Haptics } from './types';

export { useHapticsStore } from './settings';

// The web fallback plays sounds where the Vibration API is missing (iOS Safari); a quiz shouldn't beep.
Settings.enableSound(false);

/** Browsers without the Vibration API (desktop, iOS Safari) have nothing to switch off. */
export const hapticsSupported = Settings.isHapticsAvailable();

const play = (fn: () => Promise<unknown>) =>
  whenEnabled(() => {
    if (!hapticsSupported) return;
    fn().catch(() => {});
  });

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
