#!/usr/bin/env sh

set -ef

if [ -n "$FORCE_REBUILD" ] || [ ! -f ".next/BUILD_ID" ]; then
  echo 'No build found - performing one now'
  yarn build

  if [ -n "$AWS_S3_BUCKET_NAME" ]; then
    echo 'Publishing static assets to AWS'
    yarn publish:aws
  fi
fi

echo "Starting server"
yarn start
