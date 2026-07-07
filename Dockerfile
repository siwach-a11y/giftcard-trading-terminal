# Public search-only demo backend (see docs/ARCHITECTURE.md "Public demo
# backend"). Purchase execution needs a visible local browser window for
# manual 2FA/CAPTCHA and is NOT what this image is for — it only serves
# read-only search against connectors that don't require login.

# ---- build stage ------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

# The runtime stage below already ships Chromium (Playwright's official
# image) — skip downloading it again here to keep this stage fast/small.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Prisma's CLI shells out to `openssl version` to pick the right prebuilt
# engine binary; node:20-slim doesn't include the openssl CLI, so without
# this it silently defaults to the wrong OpenSSL target and `prisma db
# push` fails.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# Bake a schema-migrated, empty SQLite database into the image so the
# runtime container never needs the full `prisma` CLI — only @prisma/client
# ships in Next's standalone output.
RUN DATABASE_URL="file:/app/prisma/seed.db" npx prisma db push --skip-generate

ENV DOCKER_BUILD=1
RUN npm run build

# ---- runtime stage ------------------------------------------------------
# Playwright's official image ships Node + Chromium + every OS-level
# dependency headless Chromium needs, and a pre-created non-root `pwuser`
# so the browser sandbox works normally (no --no-sandbox flag required —
# that flag disables a real security mitigation and was deliberately not
# used here). The tag MUST match the `playwright` npm package version
# exactly (playwright-core refuses to launch a mismatched browser build) —
# check `node -e "console.log(require('./node_modules/playwright/package.json').version)"`
# whenever package-lock.json changes.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/tmp/dev.db
ENV TRADING_TERMINAL_CONFIG=/app/config/cloud.yaml

COPY --from=builder --chown=pwuser:pwuser /app/.next/standalone ./
COPY --from=builder --chown=pwuser:pwuser /app/.next/static ./.next/static
COPY --from=builder --chown=pwuser:pwuser /app/prisma/seed.db ./prisma/seed.db
COPY --from=builder --chown=pwuser:pwuser /app/config ./config
COPY --chown=pwuser:pwuser docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /tmp/screenshots && chown pwuser:pwuser /tmp/screenshots

USER pwuser
EXPOSE 8080
ENTRYPOINT ["./docker-entrypoint.sh"]
