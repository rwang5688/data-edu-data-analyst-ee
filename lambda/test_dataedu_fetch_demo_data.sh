#!/bin/bash
export AWS_REGION='us-west-2'

export SOURCE_DATA_BUCKET_NAME_PREFIX='ee-assets-prod-'
export SIS_DEMO_MOCK_DATA_PREFIX='modules/f7ff818991a14cfb80e2617aad4431d1/v1/mockdata/sis_demo_parquet/'
export LMS_DEMO_MOCK_DATA_PREFIX='modules/cfdd4f678e99415a9c1f11342a3a9887/v1/mockdata/lms_demo/v1/'
export RAW_DATA_BUCKET_NAME='dataedu-raw-123456abcdefghijklmnopqrstuvwxyz-test'
export SIS_DEMO_RAW_DATA_PREFIX='sisdemo/'
export LMS_DEMO_RAW_DATA_PREFIX='lmsdemo/'

echo "[CMD] python dataedu_fetch_demo_data.py"
python dataedu_fetch_demo_data/dataedu_fetch_demo_data.py

