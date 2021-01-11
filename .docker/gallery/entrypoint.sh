#!/usr/bin/env sh

set -euf

# check if .next does not exist or is empty
if [ ! -d ".next" ] || [ -z "$(ls -A .next)" ]; then
  echo 'No build found - performing one now'
  yarn build

  if [ -n "$AWS_S3_BUCKET_NAME" ]; then
    echo 'Publishing static assets to AWS'
    yarn publish:aws
  fi
fi

echo "Starting server"
yarn start
