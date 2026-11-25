import type { CardRow } from '@/domain/sync';

// An in-memory stand-in for the Supabase project: auth + push_progress (newer updated_at wins) + pulls.
interface ServerRow extends CardRow {
  user_id: string;
  synced_at: string;
}
const mockServer = {
  rows: [] as ServerRow[],
  settings: new Map<string, { modes: string[]; continents: string[]; updated_at: string }>(),
  clock: 0,
  offline: false,
  session: null as { user: { id: string; email: string | null; is_anonymous: boolean } } | null,
  anonCount: 0,
};
const mockTick = () => new Date(Date.UTC(2026, 10, 25, 12, 0, mockServer.clock++)).toISOString();
const mockOfflineError = () => ({ message: 'TypeError: Network request failed' });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../supabase', () => {
  const uid = () => mockServer.session!.user.id;
  const result = <T>(data: T) =>
    Promise.resolve(mockServer.offline ? { data: null, error: mockOfflineError() } : { data, error: null });
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: mockServer.session } }),
        signInAnonymously: () => {
          if (mockServer.offline) return Promise.resolve({ data: {}, error: mockOfflineError() });
          mockServer.session = { user: { id: `anon-${++mockServer.anonCount}`, email: null, is_anonymous: true } };
          return Promise.resolve({ data: { user: mockServer.session.user }, error: null });
        },
      },
      rpc: (
        _name: string,
        args: { p_cards: CardRow[]; p_settings: { modes: string[]; continents: string[]; updated_at: string } | null },
      ) => {
        if (mockServer.offline) return Promise.resolve({ error: mockOfflineError() });
        for (const c of args.p_cards) {
          const i = mockServer.rows.findIndex((r) => r.user_id === uid() && r.card === c.card);
          if (i >= 0 && mockServer.rows[i].updated_at >= c.updated_at) continue;
          const row = { ...c, user_id: uid(), synced_at: mockTick() };
          if (i >= 0) mockServer.rows[i] = row;
          else mockServer.rows.push(row);
        }
        const prev = mockServer.settings.get(uid());
        if (args.p_settings && (!prev || prev.updated_at < args.p_settings.updated_at))
          mockServer.settings.set(uid(), args.p_settings);
        return Promise.resolve({ error: null });
      },
      from: (table: string) => ({
        select: () => {
          if (table === 'user_settings') return { maybeSingle: () => result(mockServer.settings.get(uid()) ?? null) };
          let after = '';
          const q = {
            gt: (_c: string, v: string) => ((after = v), q),
            order: () => q,
            limit: (n: number) =>
              result(
                mockServer.rows
                  .filter((r) => r.user_id === uid() && r.synced_at > after)
                  .sort((a, b) => a.synced_at.localeCompare(b.synced_at))
                  .slice(0, n),
              ),
          };
          return q;
        },
      }),
    },
  };
});

import { useProgress } from '@/state/progress';

import { syncNow, useSyncStatus } from '../engine';

const card = (key: string) => useProgress.getState().cards[key];

beforeEach(() => {
  Object.assign(mockServer, { rows: [], settings: new Map(), offline: false, session: null, anonCount: 0 });
  useProgress.getState().clear();
});

it('signs in anonymously and pushes local progress', async () => {
  useProgress.getState().answer('flag:PL', true);
  await syncNow();
  expect(useSyncStatus.getState().status).toBe('synced');
  expect(useProgress.getState().ownerId).toBe('anon-1');
  expect(mockServer.rows.map((r) => [r.card, r.box])).toEqual([['flag:PL', 3]]);
  expect(useProgress.getState().dirty).toEqual({});
});

it('keeps changes made offline and sends them later', async () => {
  await syncNow();
  mockServer.offline = true;
  useProgress.getState().answer('map:FR', false);
  await syncNow();
  expect(useSyncStatus.getState().status).toBe('offline');
  expect(Object.keys(useProgress.getState().dirty)).toEqual(['map:FR']);
  mockServer.offline = false;
  await syncNow();
  expect(mockServer.rows.find((r) => r.card === 'map:FR')?.wrong).toBe(1);
  expect(useProgress.getState().dirty).toEqual({});
});

it('merges another device’s progress: the newer card wins', async () => {
  useProgress.getState().answer('flag:PL', true, 1_000);
  useProgress.getState().answer('capital:PL', false, 1_000);
  await syncNow();

  // Another device of the same user answered later.
  mockServer.rows = mockServer.rows.map((r) =>
    r.card === 'capital:PL' ? { ...r, box: 4, updated_at: new Date(5_000).toISOString(), synced_at: mockTick() } : r,
  );
  // This device changes flag:PL even later, before syncing.
  useProgress.getState().answer('flag:PL', false, 9_000);
  await syncNow();

  expect(card('capital:PL').box).toBe(4);
  expect(card('flag:PL').box).toBe(0);
  expect(mockServer.rows.find((r) => r.card === 'flag:PL')?.box).toBe(0);
});

it('propagates a reset as zeroed cards', async () => {
  useProgress.getState().answer('flag:PL', true);
  await syncNow();
  useProgress.getState().reset();
  await syncNow();
  expect(mockServer.rows.find((r) => r.card === 'flag:PL')).toMatchObject({ box: 0, seen: 0 });
});

it('syncs settings, newest first', async () => {
  useProgress.getState().setModes(['map', 'capital']);
  await syncNow();
  expect(mockServer.settings.get('anon-1')?.modes).toEqual(['map', 'capital']);
});
