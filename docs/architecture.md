# Architecture

```
_layout.tsx ── Background (gradient)
            ├─ GlobeStage ── gestures → camera ── useFrameLoop → computeFrame (scene.ts + projector.ts)
            │                                                 └→ GlobeCanvas (Skia | Canvas 2D)
            └─ Slot → screens (transparent) ── GlobeSlot → camera.setSlot
                                             └─ useGlobeStore.setPaint / setOnTap
```

- **camera** (`src/globe/camera.ts`): centre (lon/lat), zoom, slot; drag with inertia, pinch/wheel zoom, great-circle
  `flyTo`, auto-rotate. It runs its own `requestAnimationFrame` loop only while something moves and reports
  `moving`, which selects the coarser level of detail.
- **scene** (`src/globe/scene.ts`): turns camera state + paint into SVG paths, markers and rings.
- **progress store** (`src/state/progress.ts`): cards, settings, dirty set, pull cursor — persisted.
- **session store** (`src/state/session.ts`): current question, result, streak — in memory.
- **sync engine** (`src/sync/engine.ts`): ensure user (anonymous) → adopt → push dirty → pull → merge. Triggered at
  start, on foreground, on reconnect and 2.5 s after changes (`useSync`).

## Backend

```
card_progress(user_id, card "mode:CC", box, due_at, seen, correct, wrong, last_seen_at, updated_at, synced_at)
user_settings(user_id, modes[], continents[], updated_at, synced_at)
push_progress(p_cards jsonb, p_settings jsonb)   upsert, newer updated_at wins
delete_account()                                deletes auth user, cascades
```

RLS: every user (anonymous included) reads and writes only their rows. `supabase/tests` runs the migrations on
PGlite with a stand-in `auth` schema.
