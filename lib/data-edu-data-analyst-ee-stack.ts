import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
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

    // IAM Role for Fetch Demo Data Lambda Execution Role
    const fetchDemoDataLambdaRole = new iam.Role(this, "dataeduFetchDemoDataLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "dataedu-fetch-demo-data-lambda-role",
    });

    // Import Event Engine Asset Bucket
    const eeBucket = s3.Bucket.fromBucketName(
      this,
      "dataeduEEBucketName",
      "ee-assets-prod-9132e5491bd44c56aaaaefc3e91b6aa8-" + cdk.Stack.of(this).region
    );

    // Create LMS S3 Fetch Lambda Function
    const fetchDemoDataLambda = new lambda.Function(
      this,
      "dataeduFetchDemoDataLambda",
      {
        code: lambda.Code.fromBucket(
          eeBucket,
          "modules/cfdd4f678e99415a9c1f11342a3a9887/v1/lambda/data_edu_fetch_demo_data.zip"
        ),
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "data_edu_fetch_demo_data.lambda_handler.lambda_handler",
        functionName: "data-edu-fetch-demo-data",
        memorySize: 256,
        timeout: cdk.Duration.seconds(600),
        role: fetchDemoDataLambdaRole,
        environment: {
          SOURCE_DATA_BUCKET_NAME_PREFIX: 'ee-assets-prod-',
          SOURCE_MODULE_VERSION_PREFIX: 'modules/cfdd4f678e99415a9c1f11342a3a9887/v1/',
          SIS_DEMO_MOCK_DATA_PREFIX: 'mockdata/sis_demo/',
          LMS_DEMO_MOCK_DATA_PREFIX: 'mockdata/lms_demo/v1/',
          RAW_DATA_BUCKET_NAME: rawBucket.bucketName,
          SIS_DEMO_RAW_DATA_PREFIX: 'sis_demo/',
          LMS_DEMO_RAW_DATA_PREFIX: 'lms_demo/'
        },
        description:
          "Lambda function that fetches demo data from source data bucket and \
          copies the data objects to raw data bucket.",
      }
    );

    // Add policies to LMS S3 Fetch Lambda Execution Role
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [rawBucket.bucketArn],
      })
    );
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [rawBucket.bucketArn + "/*"],
      })
    );
    fetchDemoDataLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          "arn:aws:logs:" +
            cdk.Stack.of(this).region +
            ":" +
            cdk.Stack.of(this).account +
            ":log-group:/aws/lambda/data-edu-fetch-demo-data",
        ],
      })
    );
  }
}
