import { COUNTRIES, type Country } from './countries';

/** Lowercase, no diacritics, no punctuation, "saint" → "st", no leading "the". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bsaint\b/g, 'st')
    .trim()
    .replace(/^the /, '');
}

/** Optimal string alignment distance (Levenshtein + adjacent transpositions). */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
    if (rowMin > max) return max + 1;
  }
  return prev[b.length];
}

/** Typos allowed for an answer of this (normalized) length. */
export function typoTolerance(length: number): number {
  if (length >= 9) return 2;
  if (length >= 5) return 1;
  return 0;
}

export type AnswerKind = 'country' | 'capital';

function candidates(country: Country, kind: AnswerKind): string[] {
  const raw =
    kind === 'country' ? [country.name, ...country.aliases] : [...country.capitals, ...country.capitalAliases];
  return [...new Set(raw.map(normalize).filter(Boolean))];
}

const cache: Record<AnswerKind, Map<string, string[]>> = { country: new Map(), capital: new Map() };
function candidatesOf(country: Country, kind: AnswerKind): string[] {
  let list = cache[kind].get(country.code);
  if (!list) {
    list = candidates(country, kind);
    cache[kind].set(country.code, list);
  }
  return list;
}

export type Verdict =
  | { correct: true; exact: boolean }
  | { correct: false; /** The country whose name/capital the input matches instead, if any. */ matched?: string };

/**
 * Checks a typed answer. Exact matches (after normalization) of any accepted spelling are correct. Small typos
 * are forgiven unless the input is as close to another country's answer ("Iran" for Iraq is wrong).
 */
export function checkTyped(input: string, expected: Country, kind: AnswerKind): Verdict {
  const guess = normalize(input);
  if (!guess) return { correct: false };
  const own = candidatesOf(expected, kind);
  if (own.includes(guess)) return { correct: true, exact: true };

  let otherExact: string | undefined;
  let bestOther = Infinity;
  let bestOtherCode: string | undefined;
  const tolerance = typoTolerance(guess.length);
  for (const other of COUNTRIES) {
    if (other.code === expected.code) continue;
    for (const c of candidatesOf(other, kind)) {
      if (c === guess) otherExact = other.code;
      const d = editDistance(guess, c, tolerance);
      if (d < bestOther) {
        bestOther = d;
        bestOtherCode = other.code;
      }
    }
  }
  if (otherExact) return { correct: false, matched: otherExact };

  const bestOwn = Math.min(...own.map((c) => editDistance(guess, c, tolerance)));
  if (bestOwn <= tolerance && bestOwn < bestOther) return { correct: true, exact: false };
  return { correct: false, matched: bestOther <= tolerance ? bestOtherCode : undefined };
}
