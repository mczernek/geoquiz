# Setup & release

Pushing a `release-*` tag deploys: CI checks → database migrations (Supabase production) → the web app (Netlify
site `globik-app`, https://globik-app.netlify.app). Merging to `main` only runs the checks (decision 024). Android release builds run on GitHub Actions by hand and upload
to Google Play (decision 019). iOS has no pipeline yet.

| Workflow                | Trigger                       | What                                                                  |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `ci.yml`                | pull requests, push to `main` | lint, format, typecheck, unit + database tests, web export            |
| `deploy.yml`            | `release-*` tag, manual       | `ci.yml` → `supabase db push` → `pnpm build:web` → Netlify production |
| `android-release.yml`   | manual (`workflow_dispatch`)  | `ci.yml` → prebuild → signed `bundleRelease` → artifact + Play upload |
| `release-scheduled.yml` | 2026-11-26 08:15 UTC, manual  | one-off: tag `main` `release-<version>` → `deploy.yml` (delete after) |

## One-time setup

### 1. Supabase

1. Create a project (EU region like zakuper). Note the project ref, the database password and the publishable key
   (Project Settings → API).
2. Link and apply the schema (later migrations are applied by `deploy.yml`):
   ```sh
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Auth settings — anonymous sign-ins **must** be on (decision 011):
   ```sh
   SUPABASE_ACCESS_TOKEN=<personal token> SUPABASE_PROJECT_REF=<ref> WEB_URL=https://globik-app.netlify.app \
     ./supabase/scripts/apply-auth-config.sh
   ```
   Or in the dashboard: Authentication → Sign In / Providers → allow anonymous sign-ins; email provider on.
   For Google, see [Google sign-in](#google-sign-in) below (the same script turns the provider on).
4. Recommended: Authentication → Attack Protection → CAPTCHA (Turnstile) is advised by Supabase for anonymous
   sign-ins at scale; the app doesn't send a captcha token yet, so leave it off until that's added.
5. Clean up abandoned anonymous users from time to time (SQL editor or a pg_cron job):
   ```sql
   delete from auth.users u
   where u.is_anonymous and u.created_at < now() - interval '60 days'
     and not exists (select 1 from public.card_progress p where p.user_id = u.id and p.synced_at > now() - interval '60 days');
   ```
6. Add the `SUPABASE_*` secrets and `EXPO_PUBLIC_SUPABASE_*` variables to GitHub (below).

### 2. Local config

`cp .env.example .env` and fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the
Google client ids if you want "Continue with Google" (below).

### 3. Netlify (web)

1. The site `globik-app` exists; its build settings come from `netlify.toml`.
2. Deploys run from CI (`deploy.yml` builds with the GitHub variables and uploads `dist/`). Turn off Netlify's own
   Git builds (Site configuration → Build & deploy → Stop builds), or, if you keep them for previews, set the same
   `EXPO_PUBLIC_*` variables in the site's environment.
3. `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` go to GitHub (below).

### 4. GitHub

#### Secrets and variables

All are repository-level (_Settings → Secrets and variables → Actions_): there is a single production
environment. Non-sensitive values are **variables** (visible in logs, easy to edit); everything else is a
**secret**. The jobs that deploy declare the GitHub environment `production` (deployment history, and a place to
add protection rules such as required reviewers or a `main`-only branch policy); it needs no secrets of its own.

| Name                                   | Kind     | Used by       | What / where to get it                                                                                                                                                              | How to encode                        |
| -------------------------------------- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `SUPABASE_DB_URL`                      | secret   | migrations    | Dashboard → Connect → Session pooler URI with the database password filled in (IPv4; runners have no IPv6). Required: the deploy fails without it                                   | plain                                |
| `NETLIFY_AUTH_TOKEN`                   | secret   | web           | Netlify → User settings → Applications → Personal access tokens                                                                                                                     | plain                                |
| `NETLIFY_SITE_ID`                      | secret   | web           | Netlify → site `globik-app` → Site configuration → Site ID                                                                                                                          | plain                                |
| `ANDROID_KEYSTORE_BASE64`              | secret   | Android       | Upload keystore (_Google Play_ step 3)                                                                                                                                              | `base64 -i upload.jks \| pbcopy`     |
| `ANDROID_KEYSTORE_PASSWORD`            | secret   | Android       | Keystore password chosen in `keytool`                                                                                                                                               | plain                                |
| `ANDROID_KEY_ALIAS`                    | secret   | Android       | Key alias, e.g. `upload`                                                                                                                                                            | plain                                |
| `ANDROID_KEY_PASSWORD`                 | secret   | Android       | Key password (same as the store password unless you set another)                                                                                                                    | plain                                |
| `PLAY_SERVICE_ACCOUNT_JSON`            | secret   | Android       | JSON key of the Google Cloud service account (_Google Play_ step 6)                                                                                                                 | paste the JSON (`pbcopy < key.json`) |
| `EXPO_PUBLIC_SUPABASE_URL`             | variable | web, Android  | `https://<project-ref>.supabase.co`                                                                                                                                                 | plain                                |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | variable | web, Android  | Dashboard → Project Settings → API → publishable key (`sb_publishable_…`)                                                                                                           | plain                                |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`     | variable | web, Android  | Google Cloud → APIs & Services → Credentials → OAuth client "Web application" (also in Supabase Auth → Google)                                                                      | plain                                |
| `EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION` | variable | web, opt.     | Search Console → HTML tag method: only the `content="…"` value. Adds the ownership tag to `index.html` ([Google OAuth consent screen](#8-google-oauth-consent-screen-verification)) | plain                                |
| `ANDROID_VERSION_CODE_OFFSET`          | variable | Android, opt. | Added to the run number to form `versionCode` (default `100`, see _Versioning_)                                                                                                     | plain                                |

`EXPO_PUBLIC_*` values end up in the shipped app, so they are variables, not secrets. Without the Supabase ones the
app builds and works offline-only. RNRepo (prebuilt native libraries, below) needs no secret or variable: its
repository is public.

### 5. Google Play (closed testing)

1. Google Play Console developer account. Personal accounts created after Nov 2023 need a closed test with 12
   testers for 14 days before _production_.
2. Play Console → **Create app**: name "Globik", default language English (United States) (add Polish in the store
   listing), app, free. Package `com.michalczernek.geoquiz` is fixed by the first upload (decision 015).
3. Create the **upload keystore** (keep the file and passwords in a password manager; never commit it):
   ```sh
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```
   → `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
4. **First upload is manual** (the Play API can't create the first release of a new app): GitHub → Actions →
   _Android release_ → Run workflow on `main` with **upload** unchecked, then download the
   `globik-android-<version>-<versionCode>` artifact (`app-release.aab`).
5. Play Console → Testing → **Closed testing** → the default track (API name `alpha`) → Testers: create an email
   list, add testers and copy the opt-in link for them. Then **Create new release** → accept **Play App Signing**
   (Google keeps the app signing key; our keystore is only the upload key) → upload the AAB → release name
   `1.1.2 (101)` → save. Complete the app content declarations Play asks for (privacy policy, ads: none, app
   access, content rating, target audience, data safety) and send the app for review.
6. **Service account**: Google Cloud console → create/select a project → enable **Google Play Android Developer
   API** → IAM & Admin → Service accounts → create (no roles needed) → Keys → Add key → JSON →
   `PLAY_SERVICE_ACCOUNT_JSON`. Play Console → **Users and permissions → Invite new users** → the service account
   e-mail → App permissions → Globik → _Release apps to testing tracks_ and _View app information_. Access can take
   a few minutes to propagate.
7. From then on run _Android release_ with **upload** checked. While the app is still a draft in Play (before its
   first review), Play only accepts releases with status **draft** (the default input): finish them in the Play
   Console. After the review, choose **completed** to roll out to the testers directly.

### 6. Icons, splash and the store listing

Generated from the globe renderer (`pnpm icons`, sources in `design/icon`). Google Play listing (texts, graphics,
screenshots, Data safety and other Console answers): `store/play/README.md`. Privacy policy, terms of use and data
deletion: `https://globik-app.netlify.app/privacy/`, `/terms/` and `/delete-account/` (`public/`, decisions 020 and
023).

### 7. Google sign-in

Optional: without the client ids the "Continue with Google" button is hidden (decision 018). Everything lives in the
Google Cloud project **AISurveys** (shared; its consent screen is branded Globik) → **Google Auth Platform**:

1. **Branding / Audience:** see [Google OAuth consent screen](#8-google-oauth-consent-screen-verification) below
   (authorized domain `globik-app.netlify.app`, publishing). Scopes: the defaults (`openid`, `email`, `profile`).
2. **Clients → Create client → Web application** ("Globik web"):
   - Authorized JavaScript origins: `https://globik-app.netlify.app` (plus `http://localhost:8081` for `pnpm web`).
   - Authorized redirect URIs: `https://<supabase-ref>.supabase.co/auth/v1/callback`.
   - Its client id is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (web **and** Android: native sign-in asks for tokens
     issued to the web client). Its secret only goes to Supabase.
3. **Clients → Create client → Android**, package `com.michalczernek.geoquiz`, one client per signing key:
   - the upload key's SHA-1 (`keytool -list -v -keystore upload.jks`),
   - the Play App Signing key's SHA-1 (Play Console → Test and release → App integrity → App signing),
   - for local debug builds, the debug keystore's SHA-1 (`cd android && ./gradlew signingReport`).
     The app never uses these ids; Google matches the package + signature. A missing one gives `DEVELOPER_ERROR`.
4. **Clients → Create client → iOS** (when iOS sign-in is wanted), bundle id `com.michalczernek.geoquiz`:
   - its client id is `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`;
   - its reversed id (`com.googleusercontent.apps.<…>`, shown as "iOS URL scheme") goes into `app.json`, in the same
     change: `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<…>" }]`.
5. **Supabase → Authentication → Sign In / Providers → Google:** enabled, client id = the web client id (then the
   iOS client id, comma-separated, once it exists, with "Skip nonce checks" on), secret = the web client secret. Or:
   ```sh
   SUPABASE_ACCESS_TOKEN=… SUPABASE_PROJECT_REF=<ref> GOOGLE_WEB_CLIENT_ID=… GOOGLE_WEB_CLIENT_SECRET=… \
     [GOOGLE_IOS_CLIENT_ID=…] ./supabase/scripts/apply-auth-config.sh
   ```
   The script also allows the redirects back to `https://globik-app.netlify.app/**` (Authentication → URL
   Configuration). For local web testing add `http://localhost:8081/**` there by hand.
6. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) in `.env`, Netlify and the GitHub
   variables. Native builds need a new build (the module is native code).

### 8. Google OAuth consent screen: verification

With only non-sensitive scopes (`openid`, `email`, `profile`) the consent screen can be published ("In
production", any Google account can sign in) without a review. Showing the name "Globik" on it needs **brand
verification**: the home page and privacy policy pass Google's checks, and every **authorized domain** is verified
in Google Search Console by an owner or editor of the Cloud project (decision 023). Globik's pages for it: home
`https://globik-app.netlify.app/` (the web app; its static HTML and its Home screen describe the app and link the
policy and terms), privacy policy `/privacy/` (with a Google user data section and the Limited Use statement) and
terms `/terms/`.

**Which domain.** `netlify.app` is on the [Public Suffix List](https://publicsuffix.org/list/), so for Google the
"top private domain" is `globik-app.netlify.app` itself: that is the authorized domain, and it is verified with a
**URL-prefix** property `https://globik-app.netlify.app/` (a Domain property needs DNS, which Netlify's domain
doesn't give us). `netlify.app` alone can't be verified or authorized. The site needs no custom domain (but see
step 7 for Supabase's). If Google's reviewers ever object to the shared hosting domain, buy one (roughly 10–20 € a
year for a `.com` or `.app`, ~50–100 zł for `.pl`), add it to the Netlify site (Domain management, free TLS),
verify it with a Domain property (DNS TXT record) and update the URLs below, the Supabase redirect URLs and the Web
client's JavaScript origins.

1. **Search Console** (<https://search.google.com/search-console>), signed in as an owner of the Cloud project
   **AISurveys**: _Add property_ → **URL prefix** → `https://globik-app.netlify.app/` → pick one method:
   - **HTML file** (simplest): download `google<…>.html` and commit it unchanged to `public/` (served at
     `https://globik-app.netlify.app/google<…>.html`; `expo export` copies `public/` into `dist/`, and Netlify serves
     existing files before the single-page catch-all redirect, which isn't forced). Search Console doesn't follow
     redirects for this file, and none applies.
   - **HTML tag**: copy only the `content="…"` value into the GitHub variable `EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION`;
     the build adds `<meta name="google-site-verification" …>` to the head of `index.html`
     (`scripts/site-verification.mjs`).
2. Merge to `main`, push a release tag (_Releasing_ below) and wait for the deploy; check the file loads (or that
   _View source_ of the home page shows the tag) in a private window.
3. Back in Search Console: **Verify**. Keep the file or the variable afterwards: Google re-checks periodically and
   ownership lapses without it.
4. **Google Auth Platform → Branding:** app name `Globik`; user support email; app logo: leave empty (a logo makes
   brand verification mandatory); **Application home page** `https://globik-app.netlify.app/`; **Application
   privacy policy link** `https://globik-app.netlify.app/privacy/`; **Application terms of service link**
   `https://globik-app.netlify.app/terms/`; **Authorized domains**: `globik-app.netlify.app` (shown as verified after
   step 3; remove `netlify.app` if it's still listed) and `<supabase-ref>.supabase.co`, which the Web client's
   redirect URI needs; developer contact email. Save.
5. **Google Auth Platform → Data access:** only `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   (non-sensitive). No other scopes.
6. **Google Auth Platform → Audience:** user type External → **Publish app** → confirm "In production". With only
   non-sensitive scopes Google doesn't require app verification, so publishing doesn't wait for a review: any
   Google account can sign in, and without brand verification the consent screen names the app by domain instead
   of "Globik".
7. Optional, **brand verification** (Branding → _Verify branding_, then Verification Center; a few business days):
   it shows "Globik" on the consent screen and needs **every** authorized domain verified. `supabase.co` is on the
   Public Suffix List too, so `<supabase-ref>.supabase.co` is its own top private domain, and we can't verify it
   in Search Console: brand verification fails on it while the web sign-in redirects through Supabase. The ways
   out: switch the web to Google's own sign-in button with an ID token (`signInWithIdToken`, like Android; the Web
   client then needs only the JavaScript origin `https://globik-app.netlify.app` and no Supabase redirect URI; a
   code change, free), or a Supabase custom domain (paid add-on on a paid plan) on our own domain such as
   `auth.<domain>`, verified with a Domain property.

## Everyday

```sh
pnpm web | pnpm ios | pnpm android                 # develop
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db
pnpm data                                          # regenerate country data, borders and flags
supabase migration new <name>                      # schema change (backward compatible!)
```

## Releasing

- **Web + backend:** tag the commit on `main` and push the tag; `deploy.yml` runs migrations first, then the web
  app, so migrations must stay backward compatible with the released apps:
  ```sh
  git tag release-1.1.2 && git push origin release-1.1.2   # next one the same day/version: release-1.1.2-2
  ```
  Merges to `main` don't deploy: every Netlify deploy spends free-plan credits (decision 024). _Actions → Deploy →
  Run workflow_ (on a tag or `main`) redeploys by hand.
- **Android:** _Actions → Android release → Run workflow_ on `main`. Inputs: **track** (`alpha` = closed testing,
  default; `internal`, `beta`, `production`), **status** (`draft` default, `completed`), **upload** (default on;
  off = build only), **rnrepo** (default on; off = compile every native library from source, see below). Every run
  keeps the AAB and R8 `mapping.txt` as an artifact for 30 days; with upload on, both go to Play, release name
  `<version> (<versionCode>)`. It is manual on purpose, also after a deploy.
- **Locally**, `npx expo prebuild -p android && cd android && ./gradlew bundleRelease` gives a debug-signed bundle
  (fine for testing, rejected by Play). Set `GEOQUIZ_UPLOAD_STORE_FILE` (absolute path),
  `GEOQUIZ_UPLOAD_STORE_PASSWORD`, `GEOQUIZ_UPLOAD_KEY_ALIAS`, `GEOQUIZ_UPLOAD_KEY_PASSWORD` and optionally
  `GEOQUIZ_VERSION_CODE` as environment variables or Gradle properties (`-P…`, `~/.gradle/gradle.properties`) to
  sign it with the upload key (`plugins/withReleaseSigning.js`).

### Versioning

- **Version name**: `expo.version` in `app.json` (and `package.json`). Bump it on `main` before a release.
- **versionCode**: CI sets `ANDROID_VERSION_CODE_OFFSET` (default 100) + `github.run_number` of
  `android-release.yml`, so every run, uploaded or not, has a new, increasing number. Build-only runs use a number
  too; that only leaves gaps. If the workflow is renamed or recreated its run counter restarts: raise the offset
  above the last uploaded versionCode. `android.versionCode` in `app.json` is only the local fallback.

### Prebuilt native libraries (RNRepo)

`@rnrepo/expo-config-plugin` (decision 022) makes every `expo prebuild` wire
[RNRepo](https://github.com/software-mansion/rnrepo) into Gradle and the Podfile. Android and iOS builds, local and
CI, then download prebuilt AARs / xcframeworks from `packages.rnrepo.org` for each library whose installed version
has one for our React Native version, and build the rest from source. No account or token.

- **Which libraries came prebuilt:** the _RNRepo_ section of the _Android release_ run summary (step _RNRepo prebuilt
  libraries_). Locally: `cd android && ./gradlew bundleRelease --dry-run --info | grep RNRepo`. With React Native
  0.88.1 the list is still empty: RNRepo has no artifacts for 0.88 yet, so everything builds from source.
- **Turn it off** for one build: `DISABLE_RNREPO=1 ./gradlew …` (any value disables it), or uncheck **rnrepo** in
  the workflow. To always build one library from source (e.g. a patched one), list it in `rnrepo.config.json` at the
  repository root: `{ "denyList": { "android": ["react-native-screens"], "ios": [] } }`.
- **Upgrading** a native library or React Native: check rnrepo.org (supported libraries) for the new versions, or
  that library builds from source again.
