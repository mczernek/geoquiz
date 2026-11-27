import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { afterAnswer, lessonById, QUIZ_STEPS, shuffled, type Lesson, type LessonStep } from '@/domain/lessons';
import { buildQuestion, type Question } from '@/domain/questions';
import { cardKey, LEARNED_BOX, type CardState } from '@/domain/scheduler';

import { useProgress } from './progress';
import type { Result } from './session';

interface LessonProgressState {
  /** Finished steps per lesson id. Kept on this device, not synced (decision 026). */
  done: Record<string, LessonStep[]>;
  complete: (id: string, step: LessonStep) => void;
}

export const useLessonProgress = create<LessonProgressState>()(
  persist(
    (set) => ({
      done: {},
      complete: (id, step) =>
        set((s) => {
          const steps = s.done[id] ?? [];
          return steps.includes(step) ? s : { done: { ...s.done, [id]: [...steps, step] } };
        }),
    }),
    { name: 'geoquiz-lessons', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

interface LessonRunState {
  lesson: Lesson | null;
  step: LessonStep;
  /** Show steps: the country on screen. */
  index: number;
  /** Quiz steps: countries still to answer right, the current one first. */
  queue: string[];
  question: Question | null;
  result: Result | null;
  /** Increments on every new question, so views can animate in. */
  round: number;
  /** The step was just finished. */
  finished: boolean;
  undo: { before: CardState | undefined } | null;

  start: (id: string, step: LessonStep) => void;
  next: () => void;
  answer: (result: Omit<Result, 'learned'>) => Result;
  /** "I was right", as in practice (docs/specs/learning.md → Overrides). */
  override: () => Result | null;
}

function ask(code: string, step: LessonStep): Question | null {
  const mode = QUIZ_STEPS[step];
  if (!mode) return null;
  const key = cardKey(mode, code);
  return buildQuestion(key, useProgress.getState().cards[key]);
}

/**
 * The lesson being taken (in memory). Answers in the flashcard steps grade the same cards as practice, so what a
 * lesson teaches is scheduled for review like anything else.
 */
export const useLessonRun = create<LessonRunState>((set, get) => ({
  lesson: null,
  step: 'meet',
  index: 0,
  queue: [],
  question: null,
  result: null,
  round: 0,
  finished: false,
  undo: null,

  start: (id, step) => {
    const lesson = lessonById(id) ?? null;
    if (!lesson) {
      set({ lesson: null, question: null, result: null });
      return;
    }
    const queue = QUIZ_STEPS[step] ? shuffled(lesson.countries) : [];
    set((s) => ({
      lesson,
      step,
      index: 0,
      queue,
      question: queue.length ? ask(queue[0], step) : null,
      result: null,
      undo: null,
      finished: false,
      round: s.round + 1,
    }));
  },

  next: () => {
    const { lesson, step, index, queue, result } = get();
    if (!lesson || get().finished) return;
    const finish = () => {
      useLessonProgress.getState().complete(lesson.id, step);
      set({ finished: true, question: null, result: null, undo: null });
    };
    if (!QUIZ_STEPS[step]) {
      if (index + 1 >= lesson.countries.length) finish();
      else set({ index: index + 1 });
      return;
    }
    if (!result) return;
    const rest = afterAnswer(queue, result.correct);
    if (!rest.length) {
      set({ queue: rest });
      finish();
      return;
    }
    set((s) => ({ queue: rest, question: ask(rest[0], step), result: null, undo: null, round: s.round + 1 }));
  },

  answer: (partial) => {
    const { question, result } = get();
    if (!question || result) return result!;
    const { before, after } = useProgress.getState().answer(question.key, partial.correct);
    const learned = partial.correct && (before?.box ?? 0) < LEARNED_BOX && after.box >= LEARNED_BOX;
    const full: Result = { ...partial, learned };
    set({ result: full, undo: { before } });
    return full;
  },

  override: () => {
    const { question, result, undo } = get();
    if (!question || !result || result.correct || !undo) return null;
    const after = useProgress.getState().regrade(question.key, undo.before, true);
    const learned = (undo.before?.box ?? 0) < LEARNED_BOX && after.box >= LEARNED_BOX;
    const full: Result = { ...result, correct: true, givenCountry: undefined, learned, overridden: true };
    set({ result: full, undo: null });
    return full;
  },
}));
