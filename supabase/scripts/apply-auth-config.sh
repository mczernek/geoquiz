#!/usr/bin/env bash
# Applies GeoQuiz's auth settings to the remote Supabase project (docs/release.md):
# anonymous sign-ins on (decision 011), email + password with 8+ characters, site URL and redirects.
# Usage: SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... WEB_URL=https://geoquiz.netlify.app ./supabase/scripts/apply-auth-config.sh
# Optional: REQUIRE_EMAIL_CONFIRMATION=1 (needs custom SMTP so emails arrive).
set -euo pipefail
: "${SUPABASE_ACCESS_TOKEN:?}" "${SUPABASE_PROJECT_REF:?}"
WEB_URL="${WEB_URL:-https://geoquiz.netlify.app}"

payload=$(python3 - <<PY
import json, os
print(json.dumps({
    "site_url": "${WEB_URL}",
    "uri_allow_list": "geoquiz://**,${WEB_URL}/**",
    "external_anonymous_users_enabled": True,
    "external_email_enabled": True,
    "mailer_autoconfirm": os.environ.get("REQUIRE_EMAIL_CONFIRMATION") != "1",
    "password_min_length": 8,
}))
PY
)

curl -fsS -X PATCH "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" > /dev/null
echo "Auth config applied to ${SUPABASE_PROJECT_REF}"
