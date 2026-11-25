# Setup & release

## One-time setup

### 1. Supabase

1. Create a project (EU region like zakuper). Note the project ref, the database password and the publishable key
   (Project Settings → API).
2. Link and apply the schema:
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

### 2. Local config

`cp .env.example .env` and fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the
Google client ids if you want "Continue with Google" (below).

### 3. Netlify (web)

1. The site is `globik-app` (https://globik-app.netlify.app); build settings come from `netlify.toml`.
2. Site environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Deploys run from CI (below); disable Netlify's own Git builds or leave them for previews.

### 4. GitHub

Create the repository, push, and set:

- **Variables:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (optional), optionally `EAS_RELEASE_ENABLED=true`.
- **Environment `production`** (restricted to the `release` branch) **secrets:** `SUPABASE_ACCESS_TOKEN`,
  `SUPABASE_DB_URL` (session pooler URL with password), `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `EXPO_TOKEN`.

### 5. Mobile (EAS)

1. `npx eas-cli@latest init` (adds the EAS project id to `app.json`), `npx eas-cli@latest env:create` for the
   `EXPO_PUBLIC_*` variables (Supabase, and the Google client ids) in the `preview` and `production` environments.
2. Bundle id / package: `com.michalczernek.geoquiz` (change in `app.json` if you prefer).
3. Credentials: `eas credentials` (EAS can manage iOS certificates and the Android keystore).
4. Stores: App Store Connect app record + Google Play app (first upload of the Android bundle by hand). For
   `--auto-submit`: an App Store Connect API key and a Google Play service account in EAS.
5. Icons and splash are generated from the globe renderer (`pnpm icons`, sources in `design/icon`).

### 6. Google sign-in

Optional: without the client ids the "Continue with Google" button is hidden (decision 018). Everything lives in the
Google Cloud project **Globik** → **Google Auth Platform**:

1. **Branding / Audience:** app name Globik, support email, authorized domain `netlify.app` (and `supabase.co`);
   publish the app to production so any Google account can sign in. Scopes: the defaults (`openid`, `email`,
   `profile`).
2. **Clients → Create client → Web application** ("Globik web"):
   - Authorized JavaScript origins: `https://globik-app.netlify.app` (plus `http://localhost:8081` for `pnpm web`).
   - Authorized redirect URIs: `https://<supabase-ref>.supabase.co/auth/v1/callback`.
   - Its client id is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (web **and** Android: native sign-in asks for tokens
     issued to the web client). Its secret only goes to Supabase.
3. **Clients → Create client → Android**, package `com.michalczernek.geoquiz`, one client per signing key:
   - the upload key's SHA-1 (`npx eas-cli credentials -p android`, or `keytool -list -v -keystore …`),
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
6. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) in `.env`, Netlify, the GitHub
   variables and EAS (`preview`, `production`). Native builds need a new build (the module is native code).

## Everyday

```sh
pnpm web | pnpm ios | pnpm android                 # develop
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db
pnpm data                                          # regenerate country data, borders and flags
supabase migration new <name>                      # schema change (backward compatible!)
```

## Releasing

- `main` is the integration branch. Pull requests run CI (`ci.yml`).
- Merge to `release` → `release.yml`: CI → `supabase db push` (pending migrations) → Netlify production, and EAS
  production builds with auto-submit when `EAS_RELEASE_ENABLED` is `true`.
- Manual mobile builds: `npx eas-cli build --profile preview` (internal testing) or `--profile production`.
- JS-only fixes could later ship as EAS Updates (`expo-updates`, not installed yet).
