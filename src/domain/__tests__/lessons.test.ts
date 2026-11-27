import { geoDistance } from 'd3-geo';

import { CONTINENTS, countriesIn, frameOf, getCountry } from '../countries';
import {
  afterAnswer,
  firstOpenStep,
  isLessonDone,
  LESSON_SIZE,
  LESSON_STEPS,
  LESSONS,
  lessonById,
  lessonsFor,
  nextLesson,
  RETRY_GAP,
} from '../lessons';

describe('lessons', () => {
  it('cover every country exactly once, in lessons of about ten', () => {
    for (const continent of CONTINENTS) {
      const codes = lessonsFor(continent).flatMap((l) => l.countries);
      expect(codes.sort()).toEqual(
        countriesIn([continent])
          .map((c) => c.code)
          .sort(),
      );
    }
    for (const lesson of LESSONS) {
      expect(lesson.countries.length).toBeGreaterThanOrEqual(LESSON_SIZE - 3);
      expect(lesson.countries.length).toBeLessThanOrEqual(LESSON_SIZE + 5);
    }
  });

  it('group neighbours: countries in a lesson are closer together than across their continent', () => {
    const spread = (codes: string[]) => {
      let sum = 0;
      let pairs = 0;
      for (const a of codes)
        for (const b of codes) {
          if (a >= b) continue;
          sum += geoDistance(
            getCountry(a).focus.slice(0, 2) as [number, number],
            getCountry(b).focus.slice(0, 2) as [number, number],
          );
          pairs++;
        }
      return sum / pairs;
    };
    // On average: a few lessons must span a continent's far ends (Russia with Iceland, Canada with Costa Rica).
    for (const continent of CONTINENTS) {
      const lessons = lessonsFor(continent);
      if (lessons.length < 2) continue;
      const whole = spread(countriesIn([continent]).map((c) => c.code));
      const mean = lessons.reduce((sum, l) => sum + spread(l.countries), 0) / lessons.length;
      expect(mean).toBeLessThan(whole * 0.7);
    }
  });

  it('are stable and addressable by id', () => {
    expect(lessonsFor('europe').map((l) => l.id)).toEqual(['europe-1', 'europe-2', 'europe-3', 'europe-4', 'europe-5']);
    expect(lessonById('europe-2')?.number).toBe(2);
    expect(lessonById('atlantis-1')).toBeUndefined();
    expect(nextLesson('europe-5')?.id).toBe('north-america-1');
    expect(nextLesson(LESSONS[LESSONS.length - 1].id)).toBeUndefined();
  });

  it('start at the first unfinished step and are done when all five are', () => {
    expect(firstOpenStep(undefined)).toBe('meet');
    expect(firstOpenStep(['meet', 'capitals', 'flag'])).toBe('map');
    expect(isLessonDone(['meet', 'capitals', 'map', 'flag'])).toBe(false);
    expect(isLessonDone([...LESSON_STEPS])).toBe(true);
    expect(firstOpenStep([...LESSON_STEPS])).toBe('meet');
  });
});

describe('frameOf', () => {
  it('centres on a group and reaches its farthest country', () => {
    const { center, radius } = frameOf(['PL']);
    expect(center[0]).toBeCloseTo(getCountry('PL').focus[0], 5);
    expect(radius).toBeCloseTo(getCountry('PL').focus[2], 5);
    expect(frameOf(['PT', 'FI']).radius).toBeGreaterThan(15);
  });
});

describe('a flashcard round', () => {
  it('drops a country answered right and brings a wrong one back a few countries later', () => {
    expect(afterAnswer(['A', 'B', 'C', 'D', 'E'], true)).toEqual(['B', 'C', 'D', 'E']);
    expect(afterAnswer(['A', 'B', 'C', 'D', 'E'], false)).toEqual(['B', 'C', 'D', 'A', 'E']);
    expect(RETRY_GAP).toBe(3);
    expect(afterAnswer(['A', 'B'], false)).toEqual(['B', 'A']);
    expect(afterAnswer(['A'], false)).toEqual(['A']);
    expect(afterAnswer(['A'], true)).toEqual([]);
  });

  it('ends only when every country was answered right once', () => {
    let queue = ['A', 'B', 'C'];
    const wrongOnce = new Set(['A', 'C']);
    let asked = 0;
    while (queue.length) {
      const code = queue[0];
      const correct = !wrongOnce.delete(code);
      queue = afterAnswer(queue, correct);
      asked++;
    }
    expect(asked).toBe(5);
  });
});
