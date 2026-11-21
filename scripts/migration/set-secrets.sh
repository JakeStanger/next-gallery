#!/usr/bin/env bash
#
# Prompts for every secret the two Workers need and stores it with
# `wrangler secret put` (values are read by wrangler, never echoed or logged).
#
# Usage: scripts/migration/set-secrets.sh [app|processor|all]

set -euo pipefail

cd "$(dirname "$0")/../.."

APP_SECRETS=(
  NEXTAUTH_SECRET # openssl rand -base64 32
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  AUTHORIZED_EMAILS # comma separated admin emails
  STRIPE_SECRET_KEY
  API_TOKEN # openssl rand -hex 32; must match the processor's
  SENTRY_DSN
)

PROCESSOR_SECRETS=(
  API_TOKEN
)

put() {
  local config=$1
  shift
  for name in "$@"; do
    echo "--> $name ($config)"
    wrangler secret put "$name" --config "$config" --env ""
  done
}

target="${1:-all}"

if [[ "$target" == app || "$target" == all ]]; then
  put wrangler.jsonc "${APP_SECRETS[@]}"
fi

if [[ "$target" == processor || "$target" == all ]]; then
  put workers/image-processor/wrangler.jsonc "${PROCESSOR_SECRETS[@]}"
fi
