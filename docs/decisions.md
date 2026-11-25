# Decision log

Short ADR-style records, newest at the bottom: context → decision → consequences.

## 001 · One Expo app for iOS, Android and web

Unlike zakuper (two native apps + a web app), GeoQuiz is one React Native codebase.
**Decision:** Expo SDK 58 with Expo Router, dev builds (no Expo Go: Skia and Pulsar are native), CNG — `ios/` and
`android/` are generated from `app.json` and not committed.
**Consequences:** one implementation of every feature; platform differences live in `.web.ts(x)` files.

## 002 · Supabase as the backend, Netlify for the web

Same stack as zakuper: Postgres with RLS, auth, migrations in `supabase/migrations`, deployed by CI. The web app is
a static export (`expo export -p web`) on Netlify.

## 003 · Local-first progress

The app must be fully usable offline. **Decision:** progress lives in a persisted Zustand store (AsyncStorage;
localStorage on the web) and is the source of truth for the UI; sync pushes and pulls in the background
(`docs/specs/sync.md`). There is no loading state for progress, ever.

## 004 · Which countries

**Decision:** the 193 UN members, the two UN observer states (Holy See, Palestine) plus Kosovo and Taiwan — 197.
Territories (Greenland, Western Sahara, Puerto Rico…) are drawn as neutral land and aren't asked. Somaliland and
Northern Cyprus are drawn and tapped as part of Somalia and Cyprus. Capitals follow the dataset (e.g. Jerusalem for
Israel, Ramallah for Palestine), with all seats accepted where a country has several (Bolivia, South Africa…).
**Consequences:** politically sensitive choices are concentrated in `scripts/build-data.mjs` (`EXTRA`,
`FEATURE_OVERRIDES`, `CAPITALS`), easy to change.

## 005 · One shared globe behind every screen

"The whole app is based on a 3D model of the earth." **Decision:** the root layout draws one globe
(`GlobeStage`) behind the router's `Slot`; screens are transparent (`pointerEvents="box-none"`) and place the globe
with an empty `GlobeSlot` view, into which the camera animates. A single `camera` object holds the view; screens
tell the globe what to show through `useGlobeStore` (paint + tap handler).
**Consequences:** the globe never remounts, transitions between screens are camera moves. Screens must not put
opaque full-screen views over it. `Stack` (native-stack) isn't used: its native screen containers would swallow
touches meant for the globe.

## 006 · Globe rendering: custom projector, Skia on native, Canvas 2D on web, three LODs

A real 3D engine (three.js/expo-gl) was considered; vector borders that stay crisp at any zoom, exact hit tests
and a small dependency footprint favoured an orthographic 2D projection, which looks like a 3D globe with shading.
d3-geo's projection stream measured ~0.5 µs per point even on V8 — too slow per frame on Hermes.
**Decision:** rings are precomputed as unit vectors; each frame projects them with dot products, closes fills
along the horizon and cuts strokes at it (`src/globe/projector.ts`), producing SVG path strings in ¼-px integer
units. Native draws them with Skia, web with a 2D canvas (`Path2D`), avoiding CanvasKit's WASM download.
Borders come in three levels of detail (Natural Earth 1:50m simplified to 8k / 20k / 80k points); the level
depends on zoom and drops one step while the globe moves. Off-screen rings are culled. d3-geo is still used for
hit tests (`geoContains`) and fly-to interpolation.
**Consequences:** ~1 ms per frame on V8; on a dev build in the iOS simulator no React commit exceeded 16 ms while
spinning.

## 007 · Tiny countries

Vatican, Monaco, Nauru… are smaller than a pixel at most zoom levels and Tuvalu has no shape in the 1:50m data.
**Decision:** countries under 2·10⁻⁵ sr get a marker dot, win taps within 16 px of the marker, and get a ring
when highlighted.

## 008 · Spaced repetition: Leitner boxes, "known at first sight"

**Decision:** each (mode, country) card has a box 0–5; correct → next box, wrong → box 0. Waits after a correct
answer: 2 min, 20 min, 1 day, 4 days, 14 days. **Learned = box ≥ 3.** A card answered correctly the very first
time jumps straight to box 3, so people aren't drilled on what they already know. At most 7 new cards are in
learning at once; when nothing is due and no new card may start, the app asks the card due soonest (reviews
ahead), so there is always something to answer.

## 009 · Sync: per-card last write wins, client timestamps

**Decision:** a card's whole state is the unit of sync; the version with the newer client `updated_at` wins
(server RPC `push_progress` ignores older writes; pulls ignore older rows). Pull cursor = server `synced_at`, with a
5-minute overlap. Reset writes zeroed cards instead of deleting rows, so it propagates. Counters (seen/correct)
aren't summed across devices.
**Consequences:** simple and idempotent; a device with a badly wrong clock can win or lose conflicts.

## 010 · Web follows web conventions

Wheel / trackpad pinch zooms (no pinch-only zoom), mouse drag rotates, arrow keys rotate and +/- zoom, Enter
submits and moves on, routes are real URLs (`/`, `/play`, `/progress`, `/account`), the service worker makes the
app work offline after the first visit.

## 011 · Accounts: anonymous first, email + password to keep progress

**Decision:** the app signs in anonymously (Supabase anonymous sign-ins) on first sync, so progress is on the
server without any sign-up. "Create account" / "Sign in" (email + password) adopt the device's progress into that
account (merge, newer card wins). Sign-out forgets local progress. No Google/Apple sign-in yet.
**Consequences:** abandoned anonymous users accumulate; clean them up periodically (`docs/release.md`).

## 012 · Haptics with Pulsar

`react-native-pulsar` on iOS/Android and `pulsar-haptics` on the web (Vibration API; its audio fallback is turned
off) behind one `haptics` interface of semantic moments (select, correct, wrong, learned, streak…).

## 013 · Forgiving answers

**Decision:** (UI languages: see 014.) Typed answers are matched case-, accent- and punctuation-insensitively against the
name, official name, common alternatives and Polish names; a typo or two is forgiven (by length), unless the input
is as close to another country's answer ("Iran" for Iraq, "Austria" for Australia is wrong).

## 014 · English and Polish, chosen per device

**Decision:** the UI is in English or Polish (`src/i18n`). The first launch follows the device language (`Intl` on
native, `navigator.languages` on the web, so no extra native module); the Account screen switches it. The choice
is stored on the device only, not synced: it belongs to the device and the backend schema stays untouched.
Answers are accepted in both languages whatever the UI shows. Country and capital names are data
(`countries.json`: `namePl`, `capitalsPl`); Polish capitals come from Wikidata labels, reviewed by hand
(`scripts/data/capitals-pl.json`). Prompts avoid Polish declension by putting names in the nominative after a colon
("Znajdź na globie: Niemcy").
**Consequences:** a new language needs a strings file, name columns in the data build, and phrasing that keeps names
in the nominative.

## 015 · The brand is Globik; technical ids stay `geoquiz`

**Decision:** the app is called **Globik** (Polish for "little globe", easy to say in English too), with the mark
(globe + orbit + pink spark) standing in for the "o" of the wordmark (`docs/brand.md`). The repository, npm name,
Expo slug, URL scheme, bundle id / package (`com.michalczernek.geoquiz`), storage keys and the Supabase project keep
`geoquiz`: nothing user-visible, and renaming them would orphan installs, stored progress and deep links.
**Consequences:** check the name's availability in the stores and as a trademark before the first release.
