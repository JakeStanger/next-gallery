#!/usr/bin/env bash
#
# Creates the Cloudflare resources used by the app and the image processor:
# R2 buckets, queues and the D1 database.
# Safe to re-run: resources that already exist are skipped.
#
# Prerequisites: `npx wrangler login` (or CLOUDFLARE_API_TOKEN set), Workers Paid plan.
#
# Usage:
#   R2_LOCATION=weur scripts/migration/provision-cloudflare.sh
#
# Optional:
#   CDN_DOMAIN + CF_ZONE_ID       connect the public images bucket to a custom domain.
#                                 Only do this at cutover, once the existing DNS record
#                                 for CDN_DOMAIN has been removed.

set -euo pipefail

cd "$(dirname "$0")/../.."

WRANGLER=(npx --no-install wrangler)
# location hint for the buckets and the database
R2_LOCATION="${R2_LOCATION:-weur}"

# name:default storage class
BUCKETS=(
  rstanger-opennext-cache:Standard        # ISR cache (NEXT_INC_CACHE_R2_BUCKET)
  rstanger-images:Standard                # public: thumb/, marked/ (IMAGES_BUCKET)
  rstanger-images-raw:InfrequentAccess    # private: raw/ (ORIGINALS_BUCKET), rarely read
)

QUEUES=(
  image-processing
  image-processing-dlq
)

# Runs a wrangler create command, treating "already exists" as success.
create() {
  local output
  if output=$("${WRANGLER[@]}" "$@" 2>&1); then
    echo "  created: $*"
  elif grep -qiE "already exists|already been taken|already owned" <<<"$output"; then
    echo "  exists:  $*"
  else
    echo "$output" >&2
    return 1
  fi
}

echo "Creating R2 buckets (location hint: $R2_LOCATION)..."
for entry in "${BUCKETS[@]}"; do
  bucket=${entry%%:*} storage_class=${entry#*:}
  create r2 bucket create "$bucket" --location "$R2_LOCATION" --storage-class "$storage_class"
  # Also applies the storage class to a bucket that already existed
  "${WRANGLER[@]}" r2 bucket update storage-class "$bucket" --storage-class "$storage_class" >/dev/null
done

echo "Creating queues..."
for queue in "${QUEUES[@]}"; do
  create queues create "$queue"
done

echo "Creating D1 database..."
create d1 create rstanger-db --location "$R2_LOCATION"
echo "  -> copy the database_id printed above (or from \`wrangler d1 list\`) into both"
echo "     d1_databases entries in wrangler.jsonc, then run: npm run db:migrate:remote"

if [[ -n "${CDN_DOMAIN:-}" && -n "${CF_ZONE_ID:-}" ]]; then
  echo "Connecting $CDN_DOMAIN to rstanger-images..."
  create r2 bucket domain add rstanger-images --domain "$CDN_DOMAIN" --zone-id "$CF_ZONE_ID" --min-tls 1.2
else
  echo "Skipping custom domain for rstanger-images (set CDN_DOMAIN and CF_ZONE_ID at cutover)."
fi

echo "Done."
