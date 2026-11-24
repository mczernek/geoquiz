import {
  INTERVALS,
  LEARNED_BOX,
  MAX_ACTIVE,
  applyAnswer,
  cardKey,
  parseCardKey,
  pickNext,
  statsFor,
  type CardKey,
  type CardState,
} from '../scheduler';

const NOW = 1_800_000_000_000;
const pool: CardKey[] = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ'].map((c) => cardKey('flag', c));
const first = () => 0;

function state(partial: Partial<CardState>): CardState {
  return { box: 1, due: NOW, seen: 1, correct: 1, wrong: 0, lastSeen: NOW - 1, updatedAt: NOW - 1, ...partial };
}

describe('card keys', () => {
  it('round-trips', () => expect(parseCardKey(cardKey('map', 'PL'))).toEqual({ mode: 'map', code: 'PL' }));
  it('rejects junk', () => {
    expect(parseCardKey('maps:PL')).toBeNull();
    expect(parseCardKey('map:pl')).toBeNull();
  });
});

describe('applyAnswer', () => {
  it('marks a card known on the first try as learned', () => {
    const s = applyAnswer(undefined, true, NOW);
    expect(s).toMatchObject({ box: LEARNED_BOX, seen: 1, correct: 1, due: NOW + INTERVALS[LEARNED_BOX] });
  });
  it('starts a missed new card at box 0, due now', () => {
    expect(applyAnswer(undefined, false, NOW)).toMatchObject({ box: 0, due: NOW, wrong: 1, seen: 1 });
  });
  it('moves up one box per correct answer, up to 5', () => {
    expect(applyAnswer(state({ box: 1 }), true, NOW).box).toBe(2);
    expect(applyAnswer(state({ box: 5 }), true, NOW).box).toBe(5);
  });
  it('drops to box 0 on a mistake', () => {
    expect(applyAnswer(state({ box: 4 }), false, NOW)).toMatchObject({ box: 0, due: NOW, updatedAt: NOW });
  });
});

describe('pickNext', () => {
  it('returns null for an empty pool', () => {
    expect(pickNext({ pool: [], cards: {}, recent: [], now: NOW })).toBeNull();
  });
  it('introduces a new card when nothing is due', () => {
    expect(pickNext({ pool, cards: {}, recent: [], now: NOW, random: first })).toBe(pool[0]);
  });
  it('prefers due cards, lowest box first', () => {
    const cards = { [pool[3]]: state({ box: 2, due: NOW - 10 }), [pool[5]]: state({ box: 0, due: NOW - 1 }) };
    expect(pickNext({ pool, cards, recent: [], now: NOW, random: first })).toBe(pool[5]);
  });
  it('skips recently asked cards', () => {
    const cards = { [pool[5]]: state({ box: 0, due: NOW - 1 }) };
    const pick = pickNext({ pool, cards, recent: [pool[5]], now: NOW, random: first });
    expect(pick).not.toBe(pool[5]);
  });
  it('stops introducing new cards while MAX_ACTIVE are being learned', () => {
    const cards: Record<string, CardState> = {};
    for (let i = 0; i < MAX_ACTIVE; i++) cards[pool[i]] = state({ box: 1, due: NOW + 1000 * (i + 1) });
    expect(pickNext({ pool, cards, recent: [], now: NOW, random: first })).toBe(pool[0]);
  });
  it('always returns something when everything is learned and not due', () => {
    const cards: Record<string, CardState> = {};
    pool.forEach((k, i) => (cards[k] = state({ box: 4, due: NOW + 1000 * (10 - i) })));
    expect(pickNext({ pool, cards, recent: [], now: NOW })).toBe(pool[9]);
  });
  it('repeats the only card of a one-card pool', () => {
    expect(pickNext({ pool: [pool[0]], cards: {}, recent: [pool[0]], now: NOW })).toBe(pool[0]);
  });
});

describe('statsFor', () => {
  it('counts learned, seen and due cards', () => {
    const cards = {
      [pool[0]]: state({ box: 3, due: NOW + 5 }),
      [pool[1]]: state({ box: 1, due: NOW - 5 }),
      [pool[2]]: state({ box: 5, due: NOW - 5 }),
    };
    expect(statsFor(pool, cards, NOW)).toEqual({ total: 10, learned: 2, seen: 3, due: 2 });
  });
});
