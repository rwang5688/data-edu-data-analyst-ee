#!/bin/bash
export AWS_REGION='us-west-2'

export SOURCE_DATA_BUCKET_NAME_PREFIX='ee-assets-prod-'
export SOURCE_MODULE_VERSION_PREFIX='modules/cfdd4f678e99415a9c1f11342a3a9887/v1/'
export SIS_DEMO_MOCK_DATA_PREFIX='mockdata/sis_demo/'
export LMS_DEMO_MOCK_DATA_PREFIX='mockdata/lms_demo/v1/'
export RAW_DATA_BUCKET_NAME='dataedu-raw-123456abcdefghijklmnopqrstuvwxyz-test'
export SIS_DEMO_RAW_DATA_PREFIX='sisdemo_csv/'
export LMS_DEMO_RAW_DATA_PREFIX='lmsdemo_csv/'

echo "[CMD] python dataedu_fetch_demo_data.py"
python dataedu_fetch_demo_data/dataedu_fetch_demo_data.py

