#!/usr/bin/env sh

set -euf -o

if [ ! -d ".next" ]; then
  yarn build

  if [ -n "$AWS_S3_BUCKET_NAME" ]; then
    yarn publish:aws
  fi
fi

yarn start
