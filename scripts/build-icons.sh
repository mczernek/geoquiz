#!/usr/bin/env bash
# See scripts/build-icons.ts.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
npx --yes esbuild@0.25 scripts/build-icons.ts --bundle --platform=node --format=cjs --alias:@=./src \
  --loader:.json=json --outfile="$tmp/icons.cjs" --log-level=error
node "$tmp/icons.cjs" design/icon
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
shot() { "$chrome" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
  --user-data-dir="$tmp/profile" --window-size="$2,$2" --screenshot="$3" "file://$PWD/design/icon/$1.svg" >/dev/null 2>&1; }
for n in icon android-icon-foreground android-icon-background android-icon-monochrome splash-icon; do
  shot "$n" 1024 "$PWD/assets/images/$n.png"
done
shot favicon 256 "$tmp/favicon.png"
sips -z 48 48 "$tmp/favicon.png" --out assets/images/favicon.png >/dev/null
rm -rf "$tmp"
