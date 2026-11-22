#!/usr/bin/env bash
#
# Creates the Cloudflare resources used by the app and the image processor:
# R2 buckets, queues and the D1 database.
# Safe to re-run: resources that already exist are left as they are.
#
# Prerequisites: `npx wrangler login` (or CLOUDFLARE_API_TOKEN set), Workers Paid plan.
#
# Usage:
#   R2_LOCATION=weur scripts/migration/provision-cloudflare.sh
#
# The CDN domain is connected separately at cutover (see the migration runbook).

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

# exists <wrangler info command...>: whether the resource exists. Errors other than
# "not found" (e.g. not logged in) also count as missing, so the create shows them.
exists() {
  "${WRANGLER[@]}" "$@" >/dev/null 2>&1
}

# ensure <description> <info command> -- <create command>
ensure() {
  local description=$1 info=() create=()
  shift
  while [[ $1 != -- ]]; do info+=("$1"); shift; done
  shift
  create=("$@")

  if exists "${info[@]}"; then
    echo "  exists:  $description"
  else
    "${WRANGLER[@]}" "${create[@]}"
    echo "  created: $description"
  fi
}

echo "R2 buckets (location hint: $R2_LOCATION)..."
for entry in "${BUCKETS[@]}"; do
  bucket=${entry%%:*} storage_class=${entry#*:}
  ensure "bucket $bucket" r2 bucket info "$bucket" -- \
    r2 bucket create "$bucket" --location "$R2_LOCATION" --storage-class "$storage_class"
  # Also applies the storage class to a bucket that already existed
  "${WRANGLER[@]}" r2 bucket update storage-class "$bucket" --storage-class "$storage_class" >/dev/null
done

echo "Queues..."
for queue in "${QUEUES[@]}"; do
  ensure "queue $queue" queues info "$queue" -- queues create "$queue"
done

echo "D1 database..."
ensure "database rstanger-db" d1 info rstanger-db -- d1 create rstanger-db --location "$R2_LOCATION"
echo "  -> wrangler.jsonc must have its database_id (\`npx wrangler d1 list\`) in both"
echo "     d1_databases entries; then run: npm run db:migrate:remote"

echo "Done."
