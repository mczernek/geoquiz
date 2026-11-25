# AGENTS.md

Globik (repo and ids: `geoquiz`): learn the world's countries — flags, capitals and where they are — on a 3D globe. One Expo (React Native)
app for iOS, Android and the web, offline-first, with progress synced to Supabase. Details: [README.md](README.md)
and `docs/`.

## Layout

| Path                           | What                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/app/`                     | Expo Router screens (`_layout.tsx` hosts the shared globe behind every screen)                   |
| `src/domain/`                  | Pure logic with unit tests: countries, answer checking, spaced repetition, questions, sync merge |
| `src/globe/`                   | The globe: camera, fast projector, scene, Skia (native) / Canvas 2D (web) renderers, gestures    |
| `src/play/`                    | The quiz screen's parts                                                                          |
| `src/state/`                   | Zustand stores: persisted progress, in-memory session                                            |
| `src/sync/`                    | Supabase client, sync engine, account actions, web service worker registration                   |
| `src/i18n/`                    | UI strings (English, Polish), language choice, localized country names                           |
| `src/haptics/`                 | Pulsar haptics (native) and pulsar-haptics (web) behind one interface                            |
| `src/ui/`                      | Design-system components                                                                         |
| `src/data/`                    | Generated: `countries.json`, `flags.ts` (`pnpm data`)                                            |
| `assets/geo/`, `assets/flags/` | Generated: borders (TopoJSON, 3 levels of detail), flag PNGs                                     |
| `scripts/`                     | Data generation, icons and store graphics, the web service worker build step                     |
| `plugins/`                     | Local Expo config plugins (release signing / versionCode in the generated `android/`)            |
| `public/`                      | Static web files: privacy policy, data-deletion page (copied into the web export)                |
| `store/play/`                  | Google Play listing: texts, graphics, screenshots, proposed Console answers                      |
| `supabase/`                    | Migrations, database tests (PGlite)                                                              |
| `docs/specs/`                  | Behaviour specs: the source of truth                                                             |
| `docs/decisions.md`            | Numbered decisions; add one for every non-obvious choice                                         |

## Rules

- `ios/` and `android/` are generated (`npx expo prebuild`); never edit them, configure `app.json` instead.
- Add packages with `npx expo install` so versions match the Expo SDK.
- Keep domain logic pure, in `src/domain`, with tests. Screens render state and forward events.
- The globe is drawn every frame on the JS thread: keep `src/globe/projector.ts` and `scene.ts` allocation-light,
  and check `pnpm test` (it prints frame timings) after changing them.
- Backend changes must stay backward compatible with released apps: add, never rename or drop (see zakuper).
- Behaviour changes update the matching spec in `docs/specs/`.
- No dead code, no debug logging, comments explain _why_.

## Verify before you finish

```sh
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db
```

UI changes: run the app (`pnpm ios` / `pnpm android` / `pnpm web`) and check it with Argent
(`argent run screenshot`, `gesture-tap`, …) on each platform you touched.

## Releasing

Merge/push to `main` → `deploy.yml`: checks, `supabase db push` (production), Netlify production. Android: the
manual `android-release.yml` builds the AAB on GitHub Actions and uploads it to Google Play (`docs/release.md`).
Never push or merge to `main`, apply migrations to production, run `android-release.yml` or submit builds without
the human asking.
