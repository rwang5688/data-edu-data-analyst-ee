#!/bin/bash
export AWS_REGION='us-west-2'

export SOURCE_CODE_BUCKET_NAME_PREFIX='ee-assets-prod-123456abcdefghijklmnopqrstuvwxyz-'
export SOURCE_MODULE_VERSION_PREFIX='modules/cfdd4f678e99415a9c1f11342a3a9887/v1/'

rm -rf ./dataedu_fetch_demo_data_zip && mkdir dataedu_fetch_demo_data_zip
cp -r ./dataedu_fetch_demo_data/* ./dataedu_fetch_demo_data_zip
cd ./dataedu_fetch_demo_data_zip
git archive -o dataedu_fetch_demo_data.zip HEAD dataedu_fetch_demo_data.py s3_util.py requirements.txt
aws s3 cp dataedu_fetch_demo_data.zip \
    s3://${SOURCE_CODE_BUCKET_NAME_PREFIX}${AWS_REGION}/${SOURCE_MODULE_VERSION_PREFIX}lambda/
cd ..

