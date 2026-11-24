import { parseCardKey, type CardState } from './scheduler';

/** A row of `public.card_progress` (supabase/migrations). Times are ISO strings. */
export interface CardRow {
  card: string;
  box: number;
  due_at: string;
  seen: number;
  correct: number;
  wrong: number;
  last_seen_at: string | null;
  updated_at: string;
}

export function toRow(card: string, s: CardState): CardRow {
  return {
    card,
    box: s.box,
    due_at: new Date(s.due).toISOString(),
    seen: s.seen,
    correct: s.correct,
    wrong: s.wrong,
    last_seen_at: s.lastSeen ? new Date(s.lastSeen).toISOString() : null,
    updated_at: new Date(s.updatedAt).toISOString(),
  };
}

export function fromRow(row: CardRow): CardState {
  return {
    box: row.box,
    due: Date.parse(row.due_at),
    seen: row.seen,
    correct: row.correct,
    wrong: row.wrong,
    lastSeen: row.last_seen_at ? Date.parse(row.last_seen_at) : 0,
    updatedAt: Date.parse(row.updated_at),
  };
}

/**
 * Applies server rows to local cards: per card, the newer `updatedAt` wins (decision 009). Local cards that are
 * newer stay (they are still waiting to be pushed). Returns the changed cards only.
 */
export function mergeRemote(
  local: Readonly<Record<string, CardState | undefined>>,
  rows: readonly CardRow[],
): Record<string, CardState> {
  const changed: Record<string, CardState> = {};
  for (const row of rows) {
    if (!parseCardKey(row.card)) continue;
    const remote = fromRow(row);
    const mine = local[row.card];
    if (!mine || remote.updatedAt > mine.updatedAt) changed[row.card] = remote;
  }
  return changed;
}
