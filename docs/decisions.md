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
account (merge, newer card wins). Sign-out forgets local progress. No Google/Apple sign-in yet (Google: see 018).
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

## 016 · Nunito for text, Fredoka only for the wordmark

**Decision:** UI text uses Nunito (SemiBold, Bold, ExtraBold). Fredoka, the original face, has no glyphs for
ą ć ę ń ś ź ż (upstream too, not just the `@expo-google-fonts` cut), so Polish text fell back to a system font
mid-word or didn't render. Nunito is rounded and friendly like Fredoka and covers Latin Extended, Cyrillic and
Vietnamese. Baloo 2 looked closer but its tall line metrics push text off-centre in buttons. Fredoka Bold stays for
the "globik" wordmark, which has no accented letters.
**Consequences:** a new UI language must be checked against the font's glyphs (`docs/specs/i18n.md`).

## 017 · Auto-rotation waits after the user moves the globe

**Decision:** any manual drag, fling, pinch, wheel or keyboard move pauses auto-rotation for 7 s
(`AUTO_ROTATE_PAUSE_MS`), restarting the wait on every move; the spin then continues from where the user left
the view. Fly-to animations and inertia don't count as moves. A spin that starts right after letting go pulls
the country the user was looking at away.
**Consequences:** the camera arms a timer to restart its frame loop; it idles (no frames) during the pause.

## 018 · Continue with Google: native ID tokens, web redirect, the iOS scheme in app.json

**Decision:** Google sign-in sits beside email + password and behaves like Sign in (merge, newer card wins).
Android and iOS use `@react-native-google-signin/google-signin` (the free, original API) for an ID token issued to
the **web** client (`webClientId`), then `signInWithIdToken`; no Firebase files. The web uses Supabase's OAuth
redirect with PKCE (`detectSessionInUrl` on the web only) and returns to the page it left; nothing special runs
after the redirect, because every sync already adopts local progress when the session's user isn't the owner
(engine.ts), the same merge email sign-in does. The button is hidden without the platform's client ids, so builds
without Google keep working.
The library's config plugin is listed without options for now: without options it only applies Firebase files, and
there are none, so prebuild changes nothing. iOS needs the reversed iOS client id as a URL scheme; once that client
exists, the plugin entry gets `{ "iosUrlScheme": "com.googleusercontent.apps.…" }` (not a secret, so it lives in
`app.json`, which stays static JSON) in the same change that sets `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Until then the
iOS button stays hidden, because Google's SDK aborts the app when the scheme is missing.
**Consequences:** the Android OAuth clients must list the SHA-1 of every signing key (upload key and Play App
Signing), or Google returns `DEVELOPER_ERROR`. Supabase links a Google sign-in to an existing account with the
same confirmed email (automatic identity linking), so someone who signed up with a password lands in the same account.

## 019 · Deploy from `main`; Android builds on GitHub Actions, not EAS

**Decision:** every merge to `main` deploys (`deploy.yml`): checks, `supabase db push`, web export, Netlify
production. The `release` branch is gone: one branch, and pull requests are the gate. Android release bundles are
built on a GitHub runner (`android-release.yml`, run by hand): `expo prebuild`, `./gradlew bundleRelease`, upload
with `r0adkll/upload-google-play` (pinned to a commit) to a chosen track (default `alpha`, closed testing) and
status (default `draft` while the Play app is a draft). No Expo account or token is needed, and a local build takes
about 1.5 h on the development Mac. `android/` stays generated: the local config plugin
`plugins/withReleaseSigning.js` adds a `release` signing config fed by `GEOQUIZ_UPLOAD_*` Gradle properties or
environment variables, used only when they are set (otherwise debug signing, as Expo generates it), and reads
`versionCode` from `GEOQUIZ_VERSION_CODE`. CI sets it to `ANDROID_VERSION_CODE_OFFSET` (default 100) +
`github.run_number`: increasing without asking Play or committing a counter. `eas.json` is deleted (nothing uses it).
**Consequences:** renaming or recreating `android-release.yml` restarts its run counter, so the offset must then be
raised above the last upload. A change to Expo's `build.gradle` template can break the plugin's anchors; it then
fails the prebuild instead of shipping a debug-signed bundle. iOS has no pipeline yet.

## 020 · Privacy and data-deletion pages live in the web export

**Decision:** the store-required privacy policy and account-deletion pages are plain static HTML in `public/`, which
`expo export` copies into `dist/`, so they deploy with the web app at `https://globik-app.netlify.app/privacy/` and
`/delete-account/`. Netlify serves existing files before applying the SPA catch-all redirect (it isn't
`force = true`). Both languages sit on one page (anchors `#en`, `#pl`): one URL per page for the stores. They load
nothing from third parties, matching the app's no-tracking promise.
**Consequences:** a change to what the app stores or who processes it must update `public/privacy/index.html` and
the Play Data safety answers (`store/play/README.md`). The Play listing (`store/play/`) is proposed to target ages
13+, keeping the app out of the Families program until it's deliberately taken on.

## 021 · Android: block permissions the app doesn't use

**Decision:** `app.json` → `android.blockedPermissions` removes `SYSTEM_ALERT_WINDOW` (React Native's dev overlay),
external storage and biometrics (`expo-secure-store`'s optional authentication, unused) from the release manifest.
Store reviewers and users see only what Globik needs: internet, network state and vibration (haptics).
**Consequences:** using `requireAuthentication` in secure-store later means unblocking the biometric permissions.

## 022 · RNRepo: prebuilt native libraries for Android and iOS builds

**Decision:** native builds use [RNRepo](https://github.com/software-mansion/rnrepo) (Software Mansion, public
beta): a Maven repository (`packages.rnrepo.org`, group `org.rnrepo.public`, GPG-signed, built on public GitHub
workflows) of prebuilt Android AARs and iOS xcframeworks for popular libraries, one per library version × React
Native version, New Architecture only. Its Expo config plugin `@rnrepo/expo-config-plugin` (in `app.json`) makes
`expo prebuild` add the Gradle plugin (`org.rnrepo.tools.prebuilds-plugin`, from `@rnrepo/build-tools`), the
repository, and the CocoaPods hook (`rnrepo_post_install`) to the Podfile. At configuration time the plugin swaps
each library that has an artifact for the exact installed versions for the AAR and builds every other one from
source, as before, so local builds and CI need no other setup, account or token. `@rnrepo/build-tools` is a direct
dependency because `node-linker=hoisted` (`.npmrc`) and the generated Gradle file resolve it from the project root.
Why: the release AAB compiles the C++ of worklets, reanimated and Skia for three ABIs, which took about 1.5 h on the
8 GB development Mac and ran a 16 GB GitHub runner out of memory (decision 019).
**Consequences:** artifacts exist only for library/React Native pairs RNRepo has built. With React Native 0.88.1
(November 2026) none do yet (its newest is 0.87.1), so for now every library still builds from source; builds pick
artifacts up by themselves once they're published, and whenever a dependency moves past RNRepo, that library
silently falls back to source. Dependency upgrades should therefore stay on versions RNRepo covers when build time
matters (rnrepo.org lists them). Not covered at all: `react-native-pulsar` and Expo's own modules (`expo`,
`expo-modules-core` for SDK 58), which always build from source. Debug Android builds use source worklets and
reanimated anyway (`expo-modules-core` links worklets as a Gradle project); release builds can use the prebuilt
ones. Patching a covered library (patch-package, `pnpm patch`) or changing its build-time flags needs a `denyList`
entry in `rnrepo.config.json`, or the patch is ignored. Builds now also talk to `packages.rnrepo.org`; if it
misbehaves, `DISABLE_RNREPO` (set to any value) turns the Gradle plugin off for one build, and the _Android release_
workflow's `rnrepo` input does the same. Downloaded AARs live in Gradle's cache, which `setup-gradle` keeps between
CI runs.
