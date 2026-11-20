#!/usr/bin/env bash

# FUNCTION="rstanger-image-processor"
ACCOUNT_ID=157853661058

# zip -r function.zip .
#aws lambda update-function-code --function-name $FUNCTION --zip-file fileb://function.zip

aws ecr get-login-password | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com

tsc
docker buildx build --platform linux/amd64 --provenance=false -t next-gallery-lambda .
docker tag next-gallery-lambda:latest $ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com/rstanger:latest
docker push $ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com/rstanger:latest
