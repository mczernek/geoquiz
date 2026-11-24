import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONTINENTS, countriesIn, type Continent } from '@/domain/countries';
import { applyAnswer, cardKey, MODES, type CardKey, type CardState, type Mode } from '@/domain/scheduler';

export interface Settings {
  modes: Mode[];
  continents: Continent[];
  updatedAt: number;
}

interface ProgressState {
  /** The account the local progress belongs to (null: never synced). */
  ownerId: string | null;
  cards: Record<string, CardState>;
  /** Cards changed since the last successful push: key → updatedAt at change time. */
  dirty: Record<string, number>;
  settings: Settings;
  settingsDirty: boolean;
  /** Server time of the newest pulled change. */
  pullCursor: string | null;

  answer: (key: CardKey, correct: boolean, now?: number) => { before?: CardState; after: CardState };
  setModes: (modes: Mode[]) => void;
  setContinents: (continents: Continent[]) => void;
  applyRemote: (cards: Record<string, CardState>, settings: Settings | null, cursor: string | null) => void;
  markPushed: (pushed: Record<string, number>, settings: boolean) => void;
  /** Local data now belongs to `ownerId`; everything is pushed to it (merge on sign-in, decision 009). */
  adopt: (ownerId: string) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: Settings = { modes: ['flag'], continents: ['europe'], updatedAt: 0 };

const initial = {
  ownerId: null,
  cards: {},
  dirty: {},
  settings: DEFAULT_SETTINGS,
  settingsDirty: false,
  pullCursor: null,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,

      answer: (key, correct, now = Date.now()) => {
        const before = get().cards[key];
        const after = applyAnswer(before, correct, now);
        set((s) => ({ cards: { ...s.cards, [key]: after }, dirty: { ...s.dirty, [key]: after.updatedAt } }));
        return { before, after };
      },

      setModes: (modes) =>
        set((s) => ({ settings: { ...s.settings, modes, updatedAt: Date.now() }, settingsDirty: true })),

      setContinents: (continents) =>
        set((s) => ({ settings: { ...s.settings, continents, updatedAt: Date.now() }, settingsDirty: true })),

      applyRemote: (cards, settings, cursor) =>
        set((s) => {
          const useRemoteSettings = settings && settings.updatedAt > s.settings.updatedAt;
          return {
            cards: { ...s.cards, ...cards },
            settings: useRemoteSettings ? settings : s.settings,
            pullCursor: cursor ?? s.pullCursor,
          };
        }),

      markPushed: (pushed, settings) =>
        set((s) => {
          const dirty = { ...s.dirty };
          // Only clear entries that didn't change again while the request was in flight.
          for (const [key, at] of Object.entries(pushed)) if (dirty[key] === at) delete dirty[key];
          return { dirty, settingsDirty: settings ? false : s.settingsDirty };
        }),

      adopt: (ownerId) =>
        set((s) => ({
          ownerId,
          dirty: Object.fromEntries(Object.entries(s.cards).map(([k, c]) => [k, c.updatedAt])),
          settingsDirty: true,
          pullCursor: null,
        })),

      reset: () => set({ ...initial, ownerId: get().ownerId, settings: { ...DEFAULT_SETTINGS, updatedAt: Date.now() } }),
    }),
    {
      name: 'geoquiz-progress',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ ownerId, cards, dirty, settings, settingsDirty, pullCursor }) => ({
        ownerId,
        cards,
        dirty,
        settings,
        settingsDirty,
        pullCursor,
      }),
    },
  ),
);

/** All cards of the selected modes and continents. */
export function poolFor(modes: readonly Mode[], continents: readonly Continent[]): CardKey[] {
  const countries = countriesIn(continents);
  return modes.flatMap((m) => countries.map((c) => cardKey(m, c.code)));
}

export const ALL_MODES = MODES;
export const ALL_CONTINENTS = CONTINENTS;
