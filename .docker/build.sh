#!/usr/bin/env bash

set -e pipefall

source .env

yarn clean
yarn build

if [ -n "$DOCKER_REPO" ]; then
  docker build . -t "$DOCKER_REPO/next-gallery"
  docker push "$DOCKER_REPO/next-gallery"
else
  docker build . -t "next-gallery"
  docker push "next-gallery"
fi

if [ -n "$AWS_S3_BUCKET_NAME" ]; then
  echo 'Publishing static assets to AWS'
  yarn publish:aws
fi
