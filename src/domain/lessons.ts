import { CONTINENTS, countriesIn, type Continent, type Country } from './countries';
import type { Mode } from './scheduler';

/**
 * Lessons (docs/specs/lessons.md): each continent split into groups of about ten neighbouring countries, learned in
 * five steps: meet them, see their capitals, then a flashcard round for the map, the flags and the capitals.
 */
export const LESSON_SIZE = 10;
export const LESSON_STEPS = ['meet', 'capitals', 'map', 'flag', 'capital'] as const;
export type LessonStep = (typeof LESSON_STEPS)[number];

/** The steps that ask questions, and the topic each one drills. */
export const QUIZ_STEPS: Partial<Record<LessonStep, Mode>> = { map: 'map', flag: 'flag', capital: 'capital' };

/** A wrong answer comes back after this many other countries (or at the end of a shorter round). */
export const RETRY_GAP = 3;

export interface Lesson {
  /** `<continent>-<number>`: stable while the country list doesn't change. */
  id: string;
  continent: Continent;
  /** 1-based, in the continent's order. */
  number: number;
  /** Country codes, in the order the first step tours them (neighbours next to each other). */
  countries: string[];
}

type Vec = [number, number, number];

function toVec(c: Country): Vec {
  const lon = (c.focus[0] * Math.PI) / 180;
  const lat = (c.focus[1] * Math.PI) / 180;
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

/**
 * The direction the countries spread along most (the covariance matrix's main eigenvector, by power iteration).
 * Working on the sphere in 3D avoids the seam at ±180° longitude, which Oceania crosses.
 */
function mainAxis(points: Vec[]): Vec {
  const n = points.length;
  const mean = [0, 1, 2].map((i) => points.reduce((s, p) => s + p[i], 0) / n);
  const cov = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => points.reduce((s, p) => s + (p[i] - mean[i]) * (p[j] - mean[j]), 0)),
  );
  let v: Vec = [0.6, 0.5, 0.62];
  for (let k = 0; k < 50; k++) {
    const next: Vec = [0, 1, 2].map((i) => cov[i][0] * v[0] + cov[i][1] * v[1] + cov[i][2] * v[2]) as Vec;
    const len = Math.hypot(...next);
    if (len < 1e-12) break;
    v = [next[0] / len, next[1] / len, next[2] / len];
  }
  return v;
}

/** Orders countries along the direction they spread most: west to east across Europe, north to south in Chile… */
function alongAxis(countries: Country[]): Country[] {
  const axis = mainAxis(countries.map(toVec));
  // Fix the axis's sign so the order doesn't depend on where the iteration happened to land.
  const sign = axis[0] + axis[1] + axis[2] < 0 ? -1 : 1;
  const key = (c: Country) => {
    const p = toVec(c);
    return sign * (p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]);
  };
  return [...countries].sort((a, b) => key(a) - key(b) || a.code.localeCompare(b.code));
}

/** Halves a group along its longest direction until each part has about `LESSON_SIZE` countries. */
function split(countries: Country[], lessons: number): Country[][] {
  if (lessons <= 1) return [alongAxis(countries)];
  const sorted = alongAxis(countries);
  const left = Math.floor(lessons / 2);
  const cut = Math.round((sorted.length * left) / lessons);
  return [...split(sorted.slice(0, cut), left), ...split(sorted.slice(cut), lessons - left)];
}

export function lessonsFor(continent: Continent): Lesson[] {
  const countries = countriesIn([continent]);
  if (!countries.length) return [];
  const groups = split(countries, Math.max(1, Math.round(countries.length / LESSON_SIZE)));
  return groups.map((group, i) => ({
    id: `${continent}-${i + 1}`,
    continent,
    number: i + 1,
    countries: group.map((c) => c.code),
  }));
}

export const LESSONS: readonly Lesson[] = CONTINENTS.flatMap(lessonsFor);

const byId = new Map(LESSONS.map((l) => [l.id, l]));
export function lessonById(id: string): Lesson | undefined {
  return byId.get(id);
}

/** The lesson after this one: the next in its continent, then the first of the next continent. */
export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

export function isLessonDone(done: readonly LessonStep[] | undefined): boolean {
  return LESSON_STEPS.every((s) => done?.includes(s));
}

/** Where to start a lesson: its first unfinished step, or the beginning when everything is done. */
export function firstOpenStep(done: readonly LessonStep[] | undefined): LessonStep {
  return LESSON_STEPS.find((s) => !done?.includes(s)) ?? LESSON_STEPS[0];
}

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A flashcard round's queue after its first country was answered: right drops it, wrong puts it back
 * `RETRY_GAP` places later. The round is over when the queue is empty, so every country is answered right once.
 */
export function afterAnswer(queue: readonly string[], correct: boolean): string[] {
  const [first, ...rest] = queue;
  if (first === undefined) return [];
  if (correct) return rest;
  const at = Math.min(RETRY_GAP, rest.length);
  return [...rest.slice(0, at), first, ...rest.slice(at)];
}
