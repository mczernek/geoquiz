# GeoQuiz

Learn every country's flag, capital and place on the map — on a spinning 3D globe. iOS, Android and the web.

- Pick what to learn (flags, capitals, map — one or more) and where (one or more continents)
- Flashcard-style spaced repetition: the app knows what you've learned and always has something to ask
- Flags: pick the right one of four, or type the country for a flag
- Capitals: type the capital of a country, or the country of a capital
- Map: name the highlighted country, or find it and tap it on the globe
- Every answer flies the globe to the country and shows its name, flag and capital
- Works fully offline; progress syncs to the cloud (anonymous at first, with an optional account)

## Stack

Expo SDK 58 (React Native 0.88, New Architecture), Expo Router, Reanimated 4, Gesture Handler 3, React Native Skia,
Zustand, Supabase, Pulsar haptics, Netlify for the web. Globe data: Natural Earth via `world-atlas`.

## Quick start

```sh
pnpm install
cp .env.example .env          # optional: without Supabase the app keeps progress on the device only
pnpm web                      # http://localhost:8081
pnpm ios                      # dev build on the iOS simulator (expo run:ios)
pnpm android                  # dev build on an Android emulator (expo run:android)
pnpm test && pnpm test:db     # unit tests, database tests
```

Pulsar and Skia are native modules: use dev builds (`expo run:*` / EAS), not Expo Go.

## Docs

- [docs/specs/](docs/specs/) — learning, questions, globe, sync, design
- [docs/decisions.md](docs/decisions.md) — why things are the way they are
- [docs/architecture.md](docs/architecture.md) — how the code fits together
- [docs/release.md](docs/release.md) — setup, deployment and releases

## Data & licenses

Country names, capitals and regions: [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0, via
`world-countries`). Borders: [Natural Earth](https://www.naturalearthdata.com/) 1:50m (public domain, via
`world-atlas`). Flags: [flagcdn.com](https://flagcdn.com) (public domain images). Font: Fredoka (OFL).
