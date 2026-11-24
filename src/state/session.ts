import { create } from 'zustand';

import { buildQuestion, type Question } from '@/domain/questions';
import { LEARNED_BOX, pickNext, type CardKey } from '@/domain/scheduler';

import { poolFor, useProgress } from './progress';

export interface Result {
  correct: boolean;
  /** What the user answered: typed text, or the code of the chosen flag / tapped country. */
  given: string | null;
  /** A country the wrong answer matches (shown on the globe in red). */
  givenCountry?: string;
  /** Correct, but with a typo: show the right spelling. */
  typo?: boolean;
  /** The card just became learned. */
  learned: boolean;
}

interface SessionState {
  question: Question | null;
  result: Result | null;
  recent: CardKey[];
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  /** Increments on every new question, so views can animate in. */
  round: number;

  start: () => void;
  next: () => void;
  answer: (result: Omit<Result, 'learned'>) => Result;
}

/** One practice run (in memory). Progress itself goes to the persisted store. */
export const useSession = create<SessionState>((set, get) => ({
  question: null,
  result: null,
  recent: [],
  streak: 0,
  bestStreak: 0,
  answered: 0,
  correct: 0,
  round: 0,

  start: () => {
    set({ question: null, result: null, recent: [], streak: 0, bestStreak: 0, answered: 0, correct: 0 });
    get().next();
  },

  next: () => {
    const { settings, cards } = useProgress.getState();
    const pool = poolFor(settings.modes, settings.continents);
    const key = pickNext({ pool, cards, recent: get().recent, now: Date.now() });
    if (!key) {
      set({ question: null, result: null });
      return;
    }
    set((s) => ({
      question: buildQuestion(key, cards[key]),
      result: null,
      recent: [...s.recent.slice(-20), key],
      round: s.round + 1,
    }));
  },

  answer: (partial) => {
    const { question, result } = get();
    if (!question || result) return result!;
    const { before, after } = useProgress.getState().answer(question.key, partial.correct);
    const learned = partial.correct && (before?.box ?? 0) < LEARNED_BOX && after.box >= LEARNED_BOX;
    const full: Result = { ...partial, learned };
    set((s) => {
      const streak = partial.correct ? s.streak + 1 : 0;
      return {
        result: full,
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        answered: s.answered + 1,
        correct: s.correct + (partial.correct ? 1 : 0),
      };
    });
    return full;
  },
}));
