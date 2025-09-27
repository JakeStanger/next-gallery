#!/usr/bin/env bash

FUNCTION="rstanger-image-processor"

# zip -r function.zip .
#aws lambda update-function-code --function-name $FUNCTION --zip-file fileb://function.zip

tsc
docker buildx build --platform linux/amd64 --provenance=false -t next-gallery-lambda .
docker tag next-gallery-lambda:latest 157853661058.dkr.ecr.eu-west-2.amazonaws.com/rstanger:latest
docker push 157853661058.dkr.ecr.eu-west-2.amazonaws.com/rstanger:latest
