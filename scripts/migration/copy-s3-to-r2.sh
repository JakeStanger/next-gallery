#!/usr/bin/env bash
#
# Copies images from the S3 bucket to R2, keeping the same keys:
#
#   s3://<bucket>/thumb/*.webp   -> r2://rstanger-images/thumb/
#   s3://<bucket>/marked/*.webp  -> r2://rstanger-images/marked/
#   s3://<bucket>/raw/*          -> r2://rstanger-images-raw/raw/  (Infrequent Access)
#
# Processed images are served as WebP only, so other formats under thumb/ and marked/
# (e.g. .jpeg copies) are not copied.
#
# Only new/changed objects are copied, so it can be run once for the bulk copy and again
# for a final sync at cutover. Finishes with `rclone check` to verify every object exists.
#
# Requires rclone >= 1.59 (https://rclone.org/install/).
#
# Usage:
#   export AWS_S3_ACCESS_KEY_ID=... AWS_S3_SECRET_ACCESS_KEY=... AWS_S3_REGION=eu-west-2 AWS_S3_BUCKET_NAME=...
#   export R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...   # R2 API token (Object Read & Write)
#   scripts/migration/copy-s3-to-r2.sh            # copy + verify
#   DRY_RUN=1 scripts/migration/copy-s3-to-r2.sh  # show what would be copied

set -euo pipefail

: "${AWS_S3_ACCESS_KEY_ID:?}" "${AWS_S3_SECRET_ACCESS_KEY:?}" "${AWS_S3_REGION:?}" "${AWS_S3_BUCKET_NAME:?}"
: "${R2_ACCOUNT_ID:?}" "${R2_ACCESS_KEY_ID:?}" "${R2_SECRET_ACCESS_KEY:?}"

IMAGES_BUCKET="${IMAGES_BUCKET:-rstanger-images}"
ORIGINALS_BUCKET="${ORIGINALS_BUCKET:-rstanger-images-raw}"

if ! command -v rclone >/dev/null; then
  echo "rclone is required: https://rclone.org/install/" >&2
  exit 1
fi

# Remotes are configured from the environment so no rclone.conf (or credentials file) is written.
export RCLONE_CONFIG_SRC_TYPE=s3
export RCLONE_CONFIG_SRC_PROVIDER=AWS
export RCLONE_CONFIG_SRC_ACCESS_KEY_ID="$AWS_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_SRC_SECRET_ACCESS_KEY="$AWS_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_SRC_REGION="$AWS_S3_REGION"

export RCLONE_CONFIG_DST_TYPE=s3
export RCLONE_CONFIG_DST_PROVIDER=Cloudflare
export RCLONE_CONFIG_DST_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_DST_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_DST_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export RCLONE_CONFIG_DST_NO_CHECK_BUCKET=true

COMMON_FLAGS=(--transfers 16 --checkers 32 --stats 30s --stats-one-line)
if [[ -n "${DRY_RUN:-}" ]]; then
  COMMON_FLAGS+=(--dry-run)
fi

# prefix destination-remote destination-bucket extra-flags...
copy() {
  local prefix=$1 remote=$2 bucket=$3
  shift 3
  echo "==> ${prefix}/ -> ${bucket}/${prefix}/"
  rclone copy "src:${AWS_S3_BUCKET_NAME}/${prefix}" "${remote}:${bucket}/${prefix}" \
    --metadata "${COMMON_FLAGS[@]}" "$@"
}

CACHE_CONTROL="Cache-Control: public, max-age=15552000"

# rclone filter flags per prefix: processed images are WebP only
filters() {
  case "$1" in
    thumb | marked) echo "--include=*.webp" ;;
  esac
}

# Processed images are publicly served, so keep long caching.
copy thumb dst "$IMAGES_BUCKET" $(filters thumb) --header-upload "$CACHE_CONTROL"
copy marked dst "$IMAGES_BUCKET" $(filters marked) --header-upload "$CACHE_CONTROL"
# Originals are private and only read by the image processor, so they're stored as
# Infrequent Access (STANDARD_IA in the S3 API). The storage class is set on the
# destination remote only, so it doesn't apply to reads from S3.
copy raw "dst,storage_class=STANDARD_IA" "$ORIGINALS_BUCKET"

if [[ -n "${DRY_RUN:-}" ]]; then
  exit 0
fi

echo "==> Verifying (every source object must exist in R2 with the same size)"
status=0
for pair in "thumb:$IMAGES_BUCKET" "marked:$IMAGES_BUCKET" "raw:$ORIGINALS_BUCKET"; do
  prefix=${pair%%:*}
  bucket=${pair#*:}
  # shellcheck disable=SC2046 # filters() output is intentionally word-split
  rclone check "src:${AWS_S3_BUCKET_NAME}/${prefix}" "dst:${bucket}/${prefix}" \
    --one-way --size-only $(filters "$prefix") || status=1
done

if [[ $status -ne 0 ]]; then
  echo "Verification failed: re-run this script to copy the missing objects." >&2
  exit 1
fi

echo "All objects copied."
