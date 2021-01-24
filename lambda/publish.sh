#!/usr/bin/env bash

FUNCTION="rstanger-image-processor"

zip -r function.zip .
aws lambda update-function-code --function-name $FUNCTION --zip-file fileb://function.zip
