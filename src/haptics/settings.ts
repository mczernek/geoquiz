import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface HapticsState {
  /** Kept per device, not synced: whether a phone should buzz is about that phone (decision 025). */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useHapticsStore = create<HapticsState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'geoquiz-haptics', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Wraps a haptic so it plays only while haptics are on; read at call time, so the switch applies at once. */
export const whenEnabled = (fn: () => void) => (): void => {
  if (useHapticsStore.getState().enabled) fn();
};
