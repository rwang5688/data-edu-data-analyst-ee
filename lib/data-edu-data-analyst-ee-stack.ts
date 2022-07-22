import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from "constructs";

export class DataEduDataAnalystEeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Event Engine Parameters
    // Remove Default for EE Modules
    const EETeamId = new cdk.CfnParameter(this, "EETeamId", {
      type: "String",
      default: "123456abcdefghijklmnopqrstuvwxyz",
      description: "Unique ID of this Team",
    });
    const GUID = EETeamId.valueAsString;

    // KMS Key Name
    const KeyName = "dataedu-key";

    // S3 Bucket Names
    const RawBucketName = "dataedu-raw-";
    const CuratedBucketName = "dataedu-curated-";
    const ResultsBucketName = "dataedu-results-";

    // Key Policy json
    const keyPolicyJson = {
      Id: "key-consolepolicy-3",
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "Enable IAM User Permissions",
          Effect: "Allow",
          Principal: {
            AWS: "arn:aws:iam::" + cdk.Stack.of(this).account + ":root",
          },
          Action: "kms:*",
          Resource: "*",
        },
      ],
    };

    // Create KMS Policy (CDK does not generate UI Editable KMS Policy)
    // MANUALLY ADD TO KEY POLICY IN SYNTHESIZED JSON: "Id": "key-consolepolicy-3"
    // This enables adding users to the Key Policy via the IAM UI
    const keyPolicy = iam.PolicyDocument.fromJson(keyPolicyJson);

    // Create KMS Key
    const key = new kms.Key(this, "dataeduKMS", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(7),
      alias: KeyName,
      description: "KMS key to encrypt objects in the dataEDU S3 buckets.",
      enableKeyRotation: true,
      policy: keyPolicy,
    });

    // Create RAW Bucket
    const rawBucket = new s3.Bucket(this, "dataeduRawBucket", {
      bucketName: cdk.Fn.join("", [RawBucketName, GUID]),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
    });

    rawBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [`${rawBucket.bucketArn}/*`],
        conditions: {
          StringEquals: { "s3:x-amz-server-side-encryption": "AES256" },
        },
      })
    );

    rawBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [`${rawBucket.bucketArn}/*`],
        conditions: {
          StringNotLikeIfExists: {
            "s3:x-amz-server-side-encryption-aws-kms-key-id": key.keyArn,
          },
        },
      })
    );

    // Create CURATED Bucket
    const curatedBucket = new s3.Bucket(this, "dataeduCuratedBucket", {
      bucketName: cdk.Fn.join("", [CuratedBucketName, GUID]),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
    });

    curatedBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [`${curatedBucket.bucketArn}/*`],
        conditions: {
          StringEquals: { "s3:x-amz-server-side-encryption": "AES256" },
        },
      })
    );

    curatedBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [`${curatedBucket.bucketArn}/*`],
        conditions: {
          StringNotLikeIfExists: {
            "s3:x-amz-server-side-encryption-aws-kms-key-id": key.keyArn,
          },
        },
      })
    );

    // Create RESULTS Bucket
    const resultsBucket = new s3.Bucket(this, "dataeduResultsBucket", {
      bucketName: cdk.Fn.join("", [ResultsBucketName, GUID]),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
    });

    resultsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [`${resultsBucket.bucketArn}/*`],
        conditions: {
          StringEquals: { "s3:x-amz-server-side-encryption": "AES256" },
        },
      })
    );

    resultsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [`${resultsBucket.bucketArn}/*`],
        conditions: {
          StringNotLikeIfExists: {
            "s3:x-amz-server-side-encryption-aws-kms-key-id": key.keyArn,
          },
        },
      })
    );

    // Set EE Assets bucket
    const eeBucket = s3.Bucket.fromBucketName(
      this,
      "dataeduEEBucket",
      "ee-assets-prod-" + cdk.Stack.of(this).region
    );

    // Set Lambda Function source code bucket
    // ... this should eventually be the same as the EE Assets bucket
    const eeSourceCodeBucket = s3.Bucket.fromBucketName(
      this,
      "dataeduEESourceCodeBucket",
      "ee-assets-prod-123456abcdefghijklmnopqrstuvwxyz-" + cdk.Stack.of(this).region
    );

    // Create IAM role for dataedu-fetch-demo-data Lambda Function
    const fetchDemoDataLambdaRole = new iam.Role(this, "dataeduFetchDemoDataLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    // Add policies in order to read and write to ee-assets and raw buckets
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:List*"],
        resources: [
          eeBucket.bucketArn,
          rawBucket.bucketArn,
        ],
      })
    );
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [
          eeBucket.bucketArn + "/*",
          rawBucket.bucketArn + "/*",
        ],
      })
    );
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:DeleteObject"],
        resources: [rawBucket.bucketArn + "/*"],
      })
    );

    // Add policies in order to write CloudWatch logs
    // https://aws.amazon.com/premiumsupport/knowledge-center/lambda-cloudwatch-log-streams-error/
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogGroup"],
        resources: [
          "arn:aws:logs:" +
            cdk.Stack.of(this).region +
            ":" +
            cdk.Stack.of(this).account +
            ":*",
        ],
      })
    );
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
        resources: [
          "arn:aws:logs:" +
            cdk.Stack.of(this).region +
            ":" +
            cdk.Stack.of(this).account +
            ":log-group:/aws/lambda/dataedu-fetch-demo-data:*",
        ],
      })
    );

    // Create LMS S3 Fetch Lambda Function
    const fetchDemoDataLambda = new lambda.Function(
      this,
      "dataeduFetchDemoDataLambda",
      {
        code: lambda.Code.fromBucket(
          eeSourceCodeBucket,
          "modules/cfdd4f678e99415a9c1f11342a3a9887/v1/lambda/dataedu_fetch_demo_data.zip"
        ),
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "dataedu_fetch_demo_data.lambda_handler",
        functionName: "dataedu-fetch-demo-data",
        memorySize: 256,
        timeout: cdk.Duration.seconds(600),
        role: fetchDemoDataLambdaRole,
        environment: {
          SOURCE_DATA_BUCKET_NAME_PREFIX: 'ee-assets-prod-',
          SIS_DEMO_MOCK_DATA_PREFIX: 'modules/f7ff818991a14cfb80e2617aad4431d1/v1/mockdata/sis_demo_parquet/',
          LMS_DEMO_MOCK_DATA_PREFIX: 'modules/cfdd4f678e99415a9c1f11342a3a9887/v1/mockdata/lms_demo/v1/',
          RAW_DATA_BUCKET_NAME: rawBucket.bucketName,
          SIS_DEMO_RAW_DATA_PREFIX: 'sisdb/sisdemo/',
          LMS_DEMO_RAW_DATA_PREFIX: 'lmsapi/'
        },
        description:
          "Lambda function that fetches demo data from source data bucket and \
          copies the data objects to raw data bucket.",
      }
    );

    // IAM Role for Fetch Demo Data Lambda Execution Role
    const glueCrawlerRole = new iam.Role(this, 'dataeduGlueCrawlerRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
    });

    // Add AmazonS3FullAccess in order to acccess raw data bucket
    glueCrawlerRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
    );
    
    // Add policies in order to read raw bucket
    glueCrawlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:List*"],
        resources: [rawBucket.bucketArn],
      })
    );
    glueCrawlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [rawBucket.bucketArn + "/*"],
      })
    );

    // Set Raw Bucket Path
    const rawBucketPath = 's3://'+rawBucket.bucketName+'/';

    // sisdemo_crawler: Crawls S3 target path; creates db_raw_sisdemo tables
    const sisdemoCrawler = new glue.CfnCrawler(this, 'dataeduSisdemoCrawler', {
      role: glueCrawlerRole.roleArn,
      targets: {
        s3Targets: [{
          path: rawBucketPath+'sisdb/sisdemo/',
        }],
      },
    
      // the properties below are optional
      databaseName: 'db_raw_sisdemo',
      description: 'SIS demo data crawler.',
      name: 'dataedu-sisdemo-crawler',
    });

    // lmsdemo_crawler: Crawls S3 target path; creates db_raw_lmsdemo tables
    const lmsdemoCrawler = new glue.CfnCrawler(this, 'dataedLmsdemoCrawler', {
      role: glueCrawlerRole.roleArn,
      targets: {
        s3Targets: [{
          path: rawBucketPath+'lmsapi/',
        }],
      },
    
      // the properties below are optional
      databaseName: 'db_raw_lmsdemo',
      description: 'LMS demo data crawler.',
      name: 'dataedu-lmsdemo-crawler',
    });    
  }
}

