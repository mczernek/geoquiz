-- GeoQuiz: learning progress synced from offline-first clients (docs/architecture/backend.md, docs/specs/sync.md).
-- Clients keep progress locally and push changed cards; per card the newer client `updated_at` wins (decision 009).

create table public.card_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- "<mode>:<ISO alpha-2>", e.g. "flag:PL".
  card text not null check (card ~ '^(flag|capital|map):[A-Z]{2}$'),
  box smallint not null check (box between 0 and 5),
  due_at timestamptz not null,
  seen integer not null default 0 check (seen >= 0),
  correct integer not null default 0 check (correct >= 0),
  wrong integer not null default 0 check (wrong >= 0),
  last_seen_at timestamptz,
  -- Client clock of the last change: decides which version wins.
  updated_at timestamptz not null,
  -- Server clock of the last write: the cursor clients pull by.
  synced_at timestamptz not null default now(),
  primary key (user_id, card)
);

create index card_progress_user_synced on public.card_progress (user_id, synced_at);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  modes text[] not null check (modes <@ array['flag', 'capital', 'map']::text[]),
  continents text[] not null
    check (continents <@ array['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania']::text[]),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

alter table public.card_progress enable row level security;
alter table public.user_settings enable row level security;

-- Anonymous users (Supabase anonymous sign-in) are `authenticated` too: everyone owns only their rows.
create policy "own progress" on public.card_progress
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own settings" on public.user_settings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.card_progress, public.user_settings from anon;
grant select, insert, update, delete on public.card_progress, public.user_settings to authenticated;

-- Upserts a batch of cards, keeping the stored row where it is newer. Idempotent.
-- p_cards: [{card, box, due_at, seen, correct, wrong, last_seen_at, updated_at}, …]
create function public.push_progress(p_cards jsonb, p_settings jsonb default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if jsonb_array_length(coalesce(p_cards, '[]'::jsonb)) > 1000 then
    raise exception 'too_many_cards' using errcode = '22023';
  end if;

  insert into public.card_progress as cp
    (user_id, card, box, due_at, seen, correct, wrong, last_seen_at, updated_at, synced_at)
  select uid, c.card, c.box, c.due_at, c.seen, c.correct, c.wrong, c.last_seen_at, c.updated_at, now()
  from jsonb_to_recordset(coalesce(p_cards, '[]'::jsonb)) as c(
    card text, box smallint, due_at timestamptz, seen integer, correct integer, wrong integer,
    last_seen_at timestamptz, updated_at timestamptz
  )
  on conflict (user_id, card) do update set
    box = excluded.box,
    due_at = excluded.due_at,
    seen = excluded.seen,
    correct = excluded.correct,
    wrong = excluded.wrong,
    last_seen_at = excluded.last_seen_at,
    updated_at = excluded.updated_at,
    synced_at = now()
  where excluded.updated_at > cp.updated_at;

  if p_settings is not null then
    insert into public.user_settings as us (user_id, modes, continents, updated_at, synced_at)
    values (
      uid,
      array(select jsonb_array_elements_text(p_settings -> 'modes')),
      array(select jsonb_array_elements_text(p_settings -> 'continents')),
      (p_settings ->> 'updated_at')::timestamptz,
      now()
    )
    on conflict (user_id) do update set
      modes = excluded.modes,
      continents = excluded.continents,
      updated_at = excluded.updated_at,
      synced_at = now()
    where excluded.updated_at > us.updated_at;
  end if;
end;
$$;

revoke all on function public.push_progress(jsonb, jsonb) from public, anon;
grant execute on function public.push_progress(jsonb, jsonb) to authenticated;

-- Deletes the caller's account and, by cascade, all their data.
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
