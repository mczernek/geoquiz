# Offline & sync

- Everything works offline: data (countries, borders, flags) is bundled; progress is stored on the device.
- With `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set, progress also syncs to Supabase.
  Without them, Account says sync isn't set up.

## Identity (decisions 011, 018)

1. First sync: sign in anonymously; the device's progress is adopted by that user.
2. **Create account** (email + password): a new user; the device's progress moves into it. If the project requires
   email confirmation: "Check your inbox…".
3. **Sign in**: the device's progress is merged into the account (per card, newer wins) and the account's progress
   comes down.
4. **Continue with Google** (above the email form): same as Sign in — the device's progress is merged into the
   Google account (per card, newer wins); a first-time Google user gets the device's progress. Android and iOS show
   Google's native account picker; the web goes to Google's page and comes back to the same screen, where the first
   sync does the merge. Cancelling (closing the picker, "Cancel" on Google's page) is silent. Failures show a
   message in the form (offline, no Google Play services, a generic "Couldn't sign in with Google"). The button is
   hidden when sync isn't set up or the build lacks the platform's Google client id
   (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; on iOS also `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`). Signed in, Account shows
   the Google account's email.
5. **Sign out** (warns when changes haven't synced): local progress is cleared; a new anonymous profile starts.
6. **Delete account**: deletes the user and all their rows, then signs out.

Account ends with links to the privacy policy and how to delete your data: static bilingual pages in `public/`
(`/privacy/`, `/delete-account/`) on the web app's site, opened in the browser at the Polish section when the app is
in Polish. The app stores link to them too (`store/play/README.md`).

## Sync (decision 009)

- Every answer and settings change marks the card / settings dirty with its client timestamp.
- A run: ensure user → push dirty cards (batches of 500) and settings via `push_progress` → pull rows with
  `synced_at` > cursor − 5 min → keep whichever side is newer per card. Runs are serialized and coalesced.
- Triggers: app start, return to foreground, connection regained, 2.5 s after the last change, "Sync now".
- Network errors: status "offline", data stays dirty and is sent next time. Server errors: status "error".
- **Reset progress** zeroes all cards (new timestamps), so the reset reaches every device.

## Web

`pnpm build:web` exports the app and generates `dist/sw.js`, which precaches every file. After one visit the web app
opens and works offline; navigations try the network first so new deploys arrive, then fall back to the cache.

## Acceptance

- [ ] Airplane mode, kill and reopen the app: everything works, progress is kept.
- [ ] Answer offline, go online: the Account screen shows "saved in the cloud", no changes waiting.
- [ ] Create an account on device A, sign in on device B: B gets A's progress; answers on either reach the other.
- [ ] Answer a few cards signed out, Continue with Google (web, Android, iOS): Account shows the Google email and
      the cards are kept; another device signed in with the same Google account gets them.
- [ ] Cancel Google's picker / page: no message, still signed out.
- [ ] Web: visit once, stop the network, reload: the app loads and works.
