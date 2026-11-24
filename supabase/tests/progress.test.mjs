// Runs the migrations on PGlite (Postgres in WASM) with a minimal stand-in for Supabase's auth schema and roles,
// then checks RLS and push_progress. Run: pnpm test:db
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('../migrations/', import.meta.url);
const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${ALICE}'), ('${BOB}');
  `);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, dir), 'utf8'));
  }
  return db;
}

async function as(db, user, sql, params) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}

const card = (over = {}) => ({
  card: 'flag:PL',
  box: 2,
  due_at: '2026-11-25T10:00:00Z',
  seen: 3,
  correct: 2,
  wrong: 1,
  last_seen_at: '2026-11-25T09:00:00Z',
  updated_at: '2026-11-25T09:00:00Z',
  ...over,
});

test('push inserts, keeps the newer version, and is idempotent', async () => {
  const db = await setup();
  const push = (cards, settings = null) =>
    as(db, ALICE, 'select public.push_progress($1::jsonb, $2::jsonb)', [JSON.stringify(cards), settings && JSON.stringify(settings)]);

  await push([card()]);
  await push([card()]);
  await push([card({ box: 5, updated_at: '2026-11-25T08:00:00Z' })]); // older: ignored
  let rows = (await as(db, ALICE, 'select card, box from public.card_progress')).rows;
  assert.deepEqual(rows, [{ card: 'flag:PL', box: 2 }]);

  await push([card({ box: 3, updated_at: '2026-11-25T09:30:00Z' }), card({ card: 'map:FR', box: 0 })]);
  rows = (await as(db, ALICE, 'select card, box from public.card_progress order by card')).rows;
  assert.deepEqual(rows, [
    { card: 'flag:PL', box: 3 },
    { card: 'map:FR', box: 0 },
  ]);

  await push([], { modes: ['map'], continents: ['africa', 'asia'], updated_at: '2026-11-25T09:00:00Z' });
  await push([], { modes: ['flag'], continents: ['asia'], updated_at: '2026-11-25T08:00:00Z' });
  const settings = (await as(db, ALICE, 'select modes, continents from public.user_settings')).rows;
  assert.deepEqual(settings, [{ modes: ['map'], continents: ['africa', 'asia'] }]);
});

test('users only see and change their own progress', async () => {
  const db = await setup();
  await as(db, ALICE, 'select public.push_progress($1::jsonb)', [JSON.stringify([card()])]);
  assert.equal((await as(db, BOB, 'select * from public.card_progress')).rows.length, 0);
  await as(db, BOB, "update public.card_progress set box = 0 where card = 'flag:PL'");
  assert.equal((await as(db, ALICE, 'select box from public.card_progress')).rows[0].box, 2);
  await assert.rejects(
    as(db, BOB, `insert into public.card_progress (user_id, card, box, due_at, updated_at) values ('${ALICE}', 'map:PL', 1, now(), now())`),
    /row-level security/,
  );
});

test('rejects malformed cards and anonymous callers', async () => {
  const db = await setup();
  await assert.rejects(
    as(db, ALICE, 'select public.push_progress($1::jsonb)', [JSON.stringify([card({ card: 'flags:PL' })])]),
    /check constraint/,
  );
  await db.exec('set role anon;');
  await assert.rejects(db.query('select public.push_progress($1::jsonb)', ['[]']), /permission denied/);
  await db.exec('reset role;');
});

test('delete_account removes the user and cascades', async () => {
  const db = await setup();
  await as(db, ALICE, 'select public.push_progress($1::jsonb)', [JSON.stringify([card()])]);
  await as(db, ALICE, 'select public.delete_account()');
  assert.equal((await db.query('select * from public.card_progress')).rows.length, 0);
  assert.equal((await db.query(`select * from auth.users where id = '${ALICE}'`)).rows.length, 0);
});
