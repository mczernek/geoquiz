import { fromRow, mergeRemote, toRow } from '../sync';
import type { CardState } from '../scheduler';

const s: CardState = { box: 2, due: 1_800_000_000_000, seen: 3, correct: 2, wrong: 1, lastSeen: 1_799_999_000_000, updatedAt: 1_799_999_000_000 };

describe('sync rows', () => {
  it('round-trips a card', () => expect(fromRow(toRow('flag:PL', s))).toEqual(s));
  it('keeps the newer side', () => {
    const older = toRow('flag:PL', { ...s, box: 5, updatedAt: s.updatedAt - 1 });
    const newer = toRow('map:PL', { ...s, box: 5, updatedAt: s.updatedAt + 1 });
    const fresh = toRow('capital:PL', s);
    const merged = mergeRemote({ 'flag:PL': s, 'map:PL': s }, [older, newer, fresh, { ...fresh, card: 'junk' }]);
    expect(Object.keys(merged).sort()).toEqual(['capital:PL', 'map:PL']);
    expect(merged['map:PL'].box).toBe(5);
  });
});
