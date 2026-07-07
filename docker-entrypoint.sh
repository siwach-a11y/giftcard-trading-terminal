#!/bin/sh
# Cloud Run gives each new container instance a fresh, empty filesystem —
# there is no persistent volume, so SearchHistory/etc. resets on every cold
# start. That's an accepted trade-off for a public search-only demo (see
# docs/ARCHITECTURE.md "Public demo backend"), not a bug.
set -e
cp /app/prisma/seed.db /tmp/dev.db
exec node server.js
