#!/usr/bin/env bash
# Applies GeoQuiz's auth settings to the remote Supabase project (docs/release.md):
# anonymous sign-ins on (decision 011), email + password with 8+ characters, site URL and redirects,
# and the Google provider when its web client is given (decision 018).
# Usage: SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... WEB_URL=https://globik-app.netlify.app ./supabase/scripts/apply-auth-config.sh
# Optional: REQUIRE_EMAIL_CONFIRMATION=1 (needs custom SMTP so emails arrive).
# Optional: GOOGLE_WEB_CLIENT_ID=... GOOGLE_WEB_CLIENT_SECRET=... turn on "Continue with Google"; add
# GOOGLE_IOS_CLIENT_ID=... once the iOS client exists. Without them the Google provider is left as it is.
set -euo pipefail
: "${SUPABASE_ACCESS_TOKEN:?}" "${SUPABASE_PROJECT_REF:?}"
export WEB_URL="${WEB_URL:-https://globik-app.netlify.app}"

payload=$(python3 - <<'PY'
import json, os
web = os.environ["WEB_URL"].rstrip("/")
config = {
    "site_url": web,
    # The web app's Google sign-in returns to the page it started from, usually /account (`/**` covers it; listed
    # so the dashboard shows where it lands).
    "uri_allow_list": f"geoquiz://**,{web}/**,{web}/account",
    "external_anonymous_users_enabled": True,
    "external_email_enabled": True,
    "mailer_autoconfirm": os.environ.get("REQUIRE_EMAIL_CONFIRMATION") != "1",
    "password_min_length": 8,
}
client_id = os.environ.get("GOOGLE_WEB_CLIENT_ID")
secret = os.environ.get("GOOGLE_WEB_CLIENT_SECRET")
if bool(client_id) != bool(secret):
    raise SystemExit("Set both GOOGLE_WEB_CLIENT_ID and GOOGLE_WEB_CLIENT_SECRET, or neither")
if client_id:
    ios = os.environ.get("GOOGLE_IOS_CLIENT_ID")
    config.update({
        "external_google_enabled": True,
        # The first id is the web client (web redirects; Android's ID tokens are issued to it too). iOS tokens are
        # issued to the iOS client, so Supabase must accept that audience as well.
        "external_google_client_id": f"{client_id},{ios}" if ios else client_id,
        "external_google_secret": secret,
        # Google's iOS SDK puts its own nonce in the token, which the app can't pass on (Supabase's guidance).
        "external_google_skip_nonce_check": bool(ios),
    })
print(json.dumps(config))
PY
)

curl -fsS -X PATCH "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" > /dev/null
echo "Auth config applied to ${SUPABASE_PROJECT_REF}"
