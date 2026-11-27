jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { lessonById } from '@/domain/lessons';
import { cardKey } from '@/domain/scheduler';

import { useLessonProgress, useLessonRun } from '../lessons';
import { useProgress } from '../progress';

const lesson = lessonById('europe-2')!;

describe('taking a lesson', () => {
  beforeEach(() => {
    useProgress.getState().clear();
    useLessonProgress.setState({ done: {} });
  });

  it('shows every country once in the first step, then marks it done', () => {
    useLessonRun.getState().start(lesson.id, 'meet');
    for (let i = 0; i < lesson.countries.length; i++) {
      expect(useLessonRun.getState()).toMatchObject({ index: i, finished: false });
      useLessonRun.getState().next();
    }
    expect(useLessonRun.getState().finished).toBe(true);
    expect(useLessonProgress.getState().done[lesson.id]).toEqual(['meet']);
  });

  it('asks every country of a flashcard step until each is answered right, grading the practice cards', () => {
    useLessonRun.getState().start(lesson.id, 'flag');
    const asked: string[] = [];
    let first = true;
    while (!useLessonRun.getState().finished) {
      const { question } = useLessonRun.getState();
      expect(question!.key.startsWith('flag:')).toBe(true);
      asked.push(question!.country.code);
      // The very first answer is wrong: that country comes back.
      useLessonRun.getState().answer({ correct: !first, given: 'x' });
      first = false;
      useLessonRun.getState().next();
    }
    expect(asked).toHaveLength(lesson.countries.length + 1);
    expect(new Set(asked)).toEqual(new Set(lesson.countries));
    expect(useLessonProgress.getState().done[lesson.id]).toEqual(['flag']);
    const card = useProgress.getState().cards[cardKey('flag', asked[0])]!;
    expect(card).toMatchObject({ seen: 2, wrong: 1, correct: 1 });
  });

  it('counts an overridden answer as right, so the country isn’t asked again', () => {
    useLessonRun.getState().start(lesson.id, 'capital');
    const before = useLessonRun.getState().queue.length;
    useLessonRun.getState().answer({ correct: false, given: 'Varsovie' });
    expect(useLessonRun.getState().override()).toMatchObject({ correct: true, overridden: true });
    useLessonRun.getState().next();
    expect(useLessonRun.getState().queue).toHaveLength(before - 1);
  });

  it('can be restarted at any step, also after it is done', () => {
    useLessonProgress.getState().complete(lesson.id, 'map');
    useLessonRun.getState().start(lesson.id, 'map');
    expect(useLessonRun.getState()).toMatchObject({ step: 'map', finished: false });
    expect(useLessonRun.getState().queue).toHaveLength(lesson.countries.length);
  });
});
