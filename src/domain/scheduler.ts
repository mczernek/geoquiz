/**
 * Spaced repetition (docs/specs/learning.md): a Leitner box per card. A card is "learned" at box 3 or more.
 * The picker always returns a card while the pool isn't empty, so practice never runs dry.
 */
export const MODES = ['flag', 'capital', 'map'] as const;
export type Mode = (typeof MODES)[number];

export const MODE_NAMES: Record<Mode, string> = { flag: 'Flags', capital: 'Capitals', map: 'Map' };

export type CardKey = `${Mode}:${string}`;
export function cardKey(mode: Mode, code: string): CardKey {
  return `${mode}:${code}`;
}
export function parseCardKey(key: string): { mode: Mode; code: string } | null {
  const [mode, code] = key.split(':');
  if (!MODES.includes(mode as Mode) || !/^[A-Z]{2}$/.test(code ?? '')) return null;
  return { mode: mode as Mode, code };
}

export interface CardState {
  box: number;
  /** When the card should be asked again (ms since epoch). */
  due: number;
  seen: number;
  correct: number;
  wrong: number;
  lastSeen: number;
  /** Client time of the last change; the newer state wins when devices sync (decision 009). */
  updatedAt: number;
}

export const MAX_BOX = 5;
export const LEARNED_BOX = 3;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Wait after a correct answer, by the box the card moves to. */
export const INTERVALS = [0, 2 * MINUTE, 20 * MINUTE, 1 * DAY, 4 * DAY, 14 * DAY];
/** New cards being learned at once (box < LEARNED_BOX, already seen). */
export const MAX_ACTIVE = 7;
/** Cards asked recently are skipped, so a missed card returns after a few others. */
export const RECENT_GAP = 4;

export function isLearned(card: CardState | undefined): boolean {
  return (card?.box ?? 0) >= LEARNED_BOX;
}

export function applyAnswer(card: CardState | undefined, correct: boolean, now: number): CardState {
  const prev = card ?? { box: 0, due: now, seen: 0, correct: 0, wrong: 0, lastSeen: 0, updatedAt: 0 };
  let box: number;
  if (!correct) box = 0;
  // Known on the very first try: no need to drill it (decision 008).
  else if (prev.seen === 0) box = LEARNED_BOX;
  else box = Math.min(prev.box + 1, MAX_BOX);
  return {
    box,
    due: now + INTERVALS[box],
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    lastSeen: now,
    updatedAt: now,
  };
}

export interface PickInput {
  pool: readonly CardKey[];
  cards: Readonly<Record<string, CardState | undefined>>;
  /** Keys asked in this session, most recent last. */
  recent: readonly CardKey[];
  now: number;
  random?: () => number;
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Next card to ask, in priority order: due cards (lowest box first), a new card while fewer than MAX_ACTIVE are
 * being learned, the learning card due soonest, then the card due soonest overall (review ahead).
 */
export function pickNext({ pool, cards, recent, now, random = Math.random }: PickInput): CardKey | null {
  if (pool.length === 0) return null;
  const gap = Math.min(RECENT_GAP, pool.length - 1);
  const skip = new Set(recent.slice(recent.length - gap));
  const candidates = gap > 0 ? pool.filter((k) => !skip.has(k)) : [...pool];

  const seen: CardKey[] = [];
  const fresh: CardKey[] = [];
  for (const key of candidates) (cards[key]?.seen ? seen : fresh).push(key);

  const due = seen.filter((k) => cards[k]!.due <= now);
  if (due.length) {
    const minBox = Math.min(...due.map((k) => cards[k]!.box));
    const lowest = due.filter((k) => cards[k]!.box === minBox).sort((a, b) => cards[a]!.due - cards[b]!.due);
    // A little variety among the most overdue cards of the lowest box.
    return pickRandom(lowest.slice(0, 3), random);
  }

  const active = pool.filter((k) => {
    const c = cards[k];
    return c && c.seen > 0 && c.box < LEARNED_BOX;
  }).length;
  if (fresh.length && active < MAX_ACTIVE) return pickRandom(fresh, random);

  const byDue = (a: CardKey, b: CardKey) => cards[a]!.due - cards[b]!.due;
  const learning = seen.filter((k) => cards[k]!.box < LEARNED_BOX).sort(byDue);
  if (learning.length) return learning[0];
  if (fresh.length) return pickRandom(fresh, random);
  return [...seen].sort(byDue)[0] ?? null;
}

export interface Stats {
  total: number;
  learned: number;
  seen: number;
  due: number;
}

export function statsFor(
  pool: readonly CardKey[],
  cards: Readonly<Record<string, CardState | undefined>>,
  now: number,
): Stats {
  let learned = 0;
  let seen = 0;
  let due = 0;
  for (const key of pool) {
    const c = cards[key];
    if (!c || c.seen === 0) continue;
    seen++;
    if (c.box >= LEARNED_BOX) learned++;
    if (c.due <= now) due++;
  }
  return { total: pool.length, learned, seen, due };
}
