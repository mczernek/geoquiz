# Google Play listing

Everything for Globik's Play Store listing (`com.michalczernek.geoquiz`), ready for the Play Developer API
(`edits.listings`, `edits.images`) or Play Console. `pnpm play:check` checks the texts and images against Play's
limits.

## Files

| Path                                          | Play field                                          | API                                                 |
| --------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `listings/<lang>/title.txt`                   | App name (≤ 30 characters)                          | `edits.listings.update` → `title`                   |
| `listings/<lang>/short_description.txt`       | Short description (≤ 80)                            | `edits.listings.update` → `shortDescription`        |
| `listings/<lang>/full_description.txt`        | Full description (≤ 4000)                           | `edits.listings.update` → `fullDescription`         |
| `listings/<lang>/phoneScreenshots/1–6.png`    | Phone screenshots, 1080×1920, in this order         | `edits.images.upload`, `imageType=phoneScreenshots` |
| `graphics/icon.png`                           | App icon, 512×512, 32-bit PNG (same for every lang) | `edits.images.upload`, `imageType=icon`             |
| `graphics/feature-graphic-en.jpg` / `-pl.jpg` | Feature graphic, 1024×500 JPEG, no alpha            | `edits.images.upload`, `imageType=featureGraphic`   |

Languages: `en-US` (default) and `pl-PL`. Use `feature-graphic-en.jpg` for `en-US` and `feature-graphic-pl.jpg`
for `pl-PL`. Title and short description files have no trailing newline; trim the full description when uploading.

Screenshots, in order: 1 Home (topics, continents, progress), 2 a flag question (pick one of four), 3 a capital
question, 4 a map question answered (answer card), 5 Explore with a country selected, 6 Progress.

### How they were made

- **Icon and feature graphics:** `pnpm icons` (`scripts/build-icons.ts` and `.sh`) renders them from the globe
  renderer, like the app icon: `design/icon/store-icon.svg`, `feature-graphic-{en,pl}.svg` (wordmark in Fredoka
  Bold, tagline and topics in Nunito, both straight from `node_modules/@expo-google-fonts`). The taglines and
  topic names come from `src/i18n`, so they always match the app.
- **Screenshots:** the web export (`pnpm build:web`, served locally) in Chrome with a phone viewport (405×720 CSS px,
  captured at 1080×1920 through the DevTools protocol), driven with Argent taps and typing. Before shooting, the
  local progress was seeded with a plausible learner's state (about half of Europe learned) so Home and Progress
  aren't empty; questions and answers are real app screens. Language switched in Account → Language. To redo
  them, repeat that flow; screens with globe animations need ~2 s to settle.

## Web pages Play asks for

- Privacy policy: <https://globik-app.netlify.app/privacy/> (`public/privacy/index.html`, English and Polish)
- Account and data deletion: <https://globik-app.netlify.app/delete-account/> (`public/delete-account/index.html`)

They go live with the next web deploy (`release` → Netlify). Check both URLs load before submitting the forms
below; Play fetches them.

## Proposed Play Console answers

### Store settings

- **App or game:** App. **Category:** Education.
  Why not Games → Trivia: Globik is a study tool (spaced repetition, progress per country, Explore mode without
  questions), not a score-chasing quiz game; Education is where people look for flashcard and learning apps, and a
  game listing would set the wrong expectations (and be compared with trivia games).
- **Tags** (pick up to 5 from the Console's list; the closest available): Geography, Flashcards, Quiz, Educational
  games / Learning, Maps.
- **Contact details:** email `czernekmichal@gmail.com`; website `https://globik-app.netlify.app`; phone: leave
  empty (optional).
- **External marketing:** leave on (default).

### Main store listing

- Default language English (United States) – `en-US`; add Polish – `pl-PL` with the texts above.
- App name in the listing: "Globik: Flags, Capitals & Maps" / "Globik: flagi, stolice, mapy" (the name on the
  home screen stays "Globik", from `app.json`).

### App content

- **Privacy policy:** `https://globik-app.netlify.app/privacy/`
- **Ads:** No, the app doesn't contain ads.
- **App access:** All functionality is available without special access (accounts are optional; nothing is behind
  a login).
- **Content rating (IARC questionnaire):**
  - Category: **Reference, News, or Educational**.
  - Violence, fear, sexuality, crude humour, profanity, drugs, alcohol, tobacco: **No** to all.
  - Gambling or simulated gambling: **No**.
  - Users can interact or exchange content with each other (chat, sharing, UGC): **No**.
  - Shares the user's current physical location with other users: **No**.
  - Allows purchase of digital goods: **No**.
  - Unrestricted internet / web browser: **No** (links only open our own pages and a data-license page in the
    system browser).
  - Expected result: Everyone / PEGI 3 / USK 0 / ESRB Everyone.
- **Target audience and content:** ages **13–15, 16–17 and 18+**. Don't select any under-13 group.
  - Selecting under 13 puts the app under the **Families policy**: Families-compliant privacy policy and data
    practices for children (COPPA, GDPR-K), account creation (email) for children only with care (for a mixed
    audience a neutral age screen), only Families-certified SDKs, and stricter review. Globik has no ads or
    analytics, so it could qualify later (and could then try "Teacher Approved"), but it's a deliberate project,
    not a checkbox. The privacy policy says the app is for a general audience and doesn't claim COPPA compliance.
  - "Could your store listing unintentionally appeal to children?" The listing is colourful and friendly, so
    Google may decide it appeals to children. Answer honestly: it's a geography study app for teenagers and
    adults; if Google's review asks for more, the choice is to add an age screen / Families compliance or adjust
    the listing.
- **News app:** No. **COVID-19 contact tracing / status:** No. **Government app:** No.
- **Financial features:** My app doesn't provide any financial features. **Health:** No health features.
- **Advertising ID:** No, the app doesn't use an advertising ID. (Before the first upload, check that the
  bundle's merged manifest has no `com.google.android.gms.permission.AD_ID`: `bundletool dump manifest` on the AAB.)
- **Data safety** (below).

### Data safety

General questions:

- Does your app collect or share any of the required user data types? **Yes.**
- Is all of the user data collected by your app encrypted in transit? **Yes** (HTTPS to Supabase).
- Which account creation methods does your app support? **Username and password** (email + password) and **OAuth**
  (Sign in with Google, once that build ships). Account creation is optional.
- Delete account URL: `https://globik-app.netlify.app/delete-account/`
- Do you provide a way for users to request that some or all of their data is deleted without deleting their
  account? Optional answer; Globik's in-app **Reset progress** zeroes progress but keeps the rows, so answer **No**
  (deletion = delete account, or by email).

Data types (none is **shared**: Supabase, Netlify and Google process data only as our service providers, which
Play doesn't count as sharing; none is processed ephemerally):

| Data type                       | Collected | Required / optional                                                         | Purposes                              |
| ------------------------------- | --------- | --------------------------------------------------------------------------- | ------------------------------------- |
| Personal info → Email address   | Yes       | Optional (only with an account)                                             | App functionality, Account management |
| Personal info → Name            | Yes\*     | Optional (only with Google sign-in)                                         | Account management                    |
| Personal info → User IDs        | Yes       | Required (anonymous id created on first sync)                               | App functionality, Account management |
| App activity → App interactions | Yes       | Required (learning progress per card, chosen topics and continents, synced) | App functionality                     |

\* Declare Name only from the release that ships Google sign-in (Supabase keeps the Google profile's name in the
user's metadata). Not collected: location, contacts, photos, files, messages, audio, health, financial info, web
history, device or other IDs, app info and performance (no crash reporting or analytics).

Is collection required: the anonymous user id and the progress sync start automatically when the build has Supabase
configured; users can't turn them off, hence "Required".

## Closed testing checklist

1. Upload the first AAB by hand (Play needs it before API uploads; EAS `--auto-submit` afterwards, `docs/release.md`).
2. Create the closed testing track and a testers list (emails or a Google Group); share the opt-in link.
3. Personal developer accounts created after November 2023 need **at least 12 testers opted in for 14 days** of
   closed testing before they can apply for production.
4. Fill App content and Store settings as above, upload the listing, send the changes for review.
