#!/usr/bin/env bash
# Builds a static, UI-only export of the dashboard for GitHub Pages / any
# static host. This app's actual purpose (Playwright execution, Prisma
# persistence) needs a real Node server, so the API route handlers cannot
# be part of a static export — they're moved out of src/app for the
# duration of this build and always restored, even on failure.
set -euo pipefail

cd "$(dirname "$0")/.."

API_DIR="src/app/api"
API_STASH="$(mktemp -d)/api"

restore() {
  if [ -d "$API_STASH" ] && [ ! -d "$API_DIR" ]; then
    mv "$API_STASH" "$API_DIR"
  fi
}
trap restore EXIT

if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$API_STASH"
fi

STATIC_EXPORT=1 NEXT_PUBLIC_STATIC_DEMO=1 npx next build

# GitHub Pages runs output through Jekyll by default, which drops any path
# starting with an underscore (e.g. _next/) unless this marker is present.
touch out/.nojekyll

echo "Static export written to ./out"
