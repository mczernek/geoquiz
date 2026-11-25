import { create } from 'zustand';

import { buildQuestion, type Question } from '@/domain/questions';
import { LEARNED_BOX, pickNext, type CardKey, type CardState } from '@/domain/scheduler';

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
  /** The user claimed a "wrong" answer was right. */
  overridden?: boolean;
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
  /** What the last answer changed, so a wrong verdict can be overridden. */
  undo: { before: CardState | undefined; streak: number } | null;

  start: () => void;
  next: () => void;
  answer: (result: Omit<Result, 'learned'>) => Result;
  /** "I was right": counts the current wrong answer as correct (docs/specs/learning.md → Overrides). */
  override: () => Result | null;
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
  undo: null,

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
      undo: null,
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
        undo: { before, streak: s.streak },
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        answered: s.answered + 1,
        correct: s.correct + (partial.correct ? 1 : 0),
      };
    });
    return full;
  },

  override: () => {
    const { question, result, undo } = get();
    if (!question || !result || result.correct || !undo) return null;
    const after = useProgress.getState().regrade(question.key, undo.before, true);
    const learned = (undo.before?.box ?? 0) < LEARNED_BOX && after.box >= LEARNED_BOX;
    const full: Result = { ...result, correct: true, givenCountry: undefined, learned, overridden: true };
    set((s) => {
      const streak = undo.streak + 1;
      return { result: full, undo: null, streak, bestStreak: Math.max(s.bestStreak, streak), correct: s.correct + 1 };
    });
    return full;
  },
}));
