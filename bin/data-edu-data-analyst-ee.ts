#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DataEduDataAnalystEeStack } from '../lib/data-edu-data-analyst-ee-stack';

const app = new cdk.App();
new DataEduDataAnalystEeStack(app, 'DataEduDataAnalystEeStack');
