import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { CONTINENTS, type Continent } from '@/domain/countries';
import { MODES, type CardState, type Mode } from '@/domain/scheduler';
import { mergeRemote, toRow, type CardRow } from '@/domain/sync';
import { useProgress, type Settings } from '@/state/progress';

import { supabase } from './supabase';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncStore {
  status: SyncStatus;
  user: { id: string; email: string | null; anonymous: boolean } | null;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useSyncStatus = create<SyncStore>(() => ({
  status: supabase ? 'idle' : 'disabled',
  user: null,
  lastSyncedAt: null,
  error: null,
}));

const PUSH_BATCH = 500;
const PULL_PAGE = 1000;
/** Pulls overlap the previous cursor a little: rows committed late with an earlier timestamp aren't missed. */
const PULL_OVERLAP_MS = 5 * 60_000;

function describeUser(user: User | null): SyncStore['user'] {
  return user ? { id: user.id, email: user.email ?? null, anonymous: Boolean(user.is_anonymous) } : null;
}

/** Supabase returns plain `{ message }` objects (PostgREST errors), not Error instances. */
function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

function isNetworkError(e: unknown): boolean {
  return /network|fetch|timed? ?out|offline|internet|load failed/i.test(messageOf(e));
}

/** Signs in anonymously the first time, so progress has an owner on the server (decision 009). */
async function ensureUser(): Promise<User> {
  const client = supabase!;
  const { data } = await client.auth.getSession();
  if (data.session?.user) return data.session.user;
  const { data: anon, error } = await client.auth.signInAnonymously();
  if (error || !anon.user) throw error ?? new Error('Anonymous sign-in failed');
  return anon.user;
}

async function push(): Promise<void> {
  const client = supabase!;
  const { cards, dirty, settings, settingsDirty } = useProgress.getState();
  const keys = Object.keys(dirty).filter((k) => cards[k]);
  let sendSettings = settingsDirty;
  for (let i = 0; i < keys.length || sendSettings; i += PUSH_BATCH) {
    const batch = keys.slice(i, i + PUSH_BATCH);
    const pushed = Object.fromEntries(batch.map((k) => [k, dirty[k]]));
    const { error } = await client.rpc('push_progress', {
      p_cards: batch.map((k) => toRow(k, cards[k])),
      p_settings: sendSettings
        ? {
            modes: settings.modes,
            continents: settings.continents,
            updated_at: new Date(settings.updatedAt || Date.now()).toISOString(),
          }
        : null,
    });
    if (error) throw error;
    useProgress.getState().markPushed(pushed, sendSettings);
    sendSettings = false;
  }
}

async function pull(): Promise<void> {
  const client = supabase!;
  const { pullCursor } = useProgress.getState();
  const since = pullCursor ? new Date(Date.parse(pullCursor) - PULL_OVERLAP_MS).toISOString() : '1970-01-01T00:00:00Z';
  let cursor = pullCursor;
  let after = since;
  const changed: Record<string, CardState> = {};
  for (;;) {
    const { data, error } = await client
      .from('card_progress')
      .select('card, box, due_at, seen, correct, wrong, last_seen_at, updated_at, synced_at')
      .gt('synced_at', after)
      .order('synced_at', { ascending: true })
      .limit(PULL_PAGE);
    if (error) throw error;
    const rows = (data ?? []) as (CardRow & { synced_at: string })[];
    Object.assign(changed, mergeRemote({ ...useProgress.getState().cards, ...changed }, rows));
    if (rows.length) {
      after = rows[rows.length - 1].synced_at;
      if (!cursor || after > cursor) cursor = after;
    }
    if (rows.length < PULL_PAGE) break;
  }

  const { data: s, error } = await client.from('user_settings').select('modes, continents, updated_at').maybeSingle();
  if (error) throw error;
  const remoteSettings: Settings | null = s
    ? {
        modes: (s.modes as string[]).filter((m): m is Mode => MODES.includes(m as Mode)),
        continents: (s.continents as string[]).filter((c): c is Continent => CONTINENTS.includes(c as Continent)),
        updatedAt: Date.parse(s.updated_at as string),
      }
    : null;
  const valid = remoteSettings && remoteSettings.modes.length && remoteSettings.continents.length;
  useProgress.getState().applyRemote(changed, valid ? remoteSettings : null, cursor);
}

let running: Promise<void> | null = null;
let again = false;

/** Pushes local changes, then pulls the server's. Safe to call often: runs are serialized and coalesced. */
export function syncNow(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      useSyncStatus.setState({ status: 'syncing', error: null });
      try {
        const user = await ensureUser();
        useSyncStatus.setState({ user: describeUser(user) });
        const progress = useProgress.getState();
        if (progress.ownerId !== user.id) progress.adopt(user.id);
        await push();
        await pull();
        useSyncStatus.setState({ status: 'synced', lastSyncedAt: Date.now() });
      } catch (e) {
        const offline = isNetworkError(e);
        useSyncStatus.setState({ status: offline ? 'offline' : 'error', error: offline ? null : messageOf(e) });
        again = false;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Refreshes `user` in the status store from the stored session (no network). */
export async function loadUser(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  useSyncStatus.setState({ user: describeUser(data.session?.user ?? null) });
}
