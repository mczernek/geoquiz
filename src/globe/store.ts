import { create } from 'zustand';

import type { LonLat } from './geo';
import { EMPTY_PAINT, type Paint } from './scene';

export type TapHandler = (code: string | null, point: LonLat) => void;

interface GlobeStore {
  paint: Paint;
  /** Set by the screen that wants taps on countries (the "find it on the map" question). */
  onTap: TapHandler | null;
  setPaint: (paint: Paint) => void;
  setOnTap: (handler: TapHandler | null) => void;
}

/** What the current screen shows on the shared globe (decision 005). */
export const useGlobeStore = create<GlobeStore>((set) => ({
  paint: EMPTY_PAINT,
  onTap: null,
  setPaint: (paint) => set({ paint }),
  setOnTap: (onTap) => set({ onTap }),
}));
