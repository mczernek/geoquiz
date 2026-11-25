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
   SUPABASE_ACCESS_TOKEN=<personal token> SUPABASE_PROJECT_REF=<ref> WEB_URL=https://<site>.netlify.app \
     ./supabase/scripts/apply-auth-config.sh
   ```
   Or in the dashboard: Authentication → Sign In / Providers → allow anonymous sign-ins; email provider on.
4. Recommended: Authentication → Attack Protection → CAPTCHA (Turnstile) is advised by Supabase for anonymous
   sign-ins at scale; the app doesn't send a captcha token yet, so leave it off until that's added.
5. Clean up abandoned anonymous users from time to time (SQL editor or a pg_cron job):
   ```sql
   delete from auth.users u
   where u.is_anonymous and u.created_at < now() - interval '60 days'
     and not exists (select 1 from public.card_progress p where p.user_id = u.id and p.synced_at > now() - interval '60 days');
   ```

### 2. Local config

`cp .env.example .env` and fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### 3. Netlify (web)

1. Create a site (e.g. `geoquiz`); build settings come from `netlify.toml`.
2. Site environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Deploys run from CI (below); disable Netlify's own Git builds or leave them for previews.

### 4. GitHub

Create the repository, push, and set:

- **Variables:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optionally
  `EAS_RELEASE_ENABLED=true`.
- **Environment `production`** (restricted to the `release` branch) **secrets:** `SUPABASE_ACCESS_TOKEN`,
  `SUPABASE_DB_URL` (session pooler URL with password), `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `EXPO_TOKEN`.

### 5. Mobile (EAS)

1. `npx eas-cli@latest init` (adds the EAS project id to `app.json`), `npx eas-cli@latest env:create` for the two
   `EXPO_PUBLIC_*` variables in the `preview` and `production` environments.
2. Bundle id / package: `com.michalczernek.geoquiz` (change in `app.json` if you prefer).
3. Credentials: `eas credentials` (EAS can manage iOS certificates and the Android keystore).
4. Stores: App Store Connect app record + Google Play app (first upload of the Android bundle by hand). For
   `--auto-submit`: an App Store Connect API key and a Google Play service account in EAS.
5. Replace the placeholder icon and splash (`assets/images/`): they are Expo's defaults.

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
