import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as eb from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";

export class DataEduDataAnalystEeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Event Engine Parameters
    // Remove Default for EE Modules
    const EETeamId = new cdk.CfnParameter(this, "EETeamId", {
      type: "String",
      default: "12_digit_aws_account_id_or_32_digit_guid",
      description: "Unique ID of this Team",
    });
    const GUID = EETeamId.valueAsString;

    // DMS Role Creation CloudFormation Parameter + Condition
    const createDMSRole = new cdk.CfnParameter(this, "createDMSRole", {
      allowedValues: ["true", "false"],
      constraintDescription: "Value must be set to true or false.",
      default: "true",
      description:
        "Set this value to false if the 'dms-vpc-role' IAM Role has already been created in this AWS Account.",
    });

    const createDMSRoleCondition = new cdk.CfnCondition(
      this,
      "createDMSRoleCondition",
      {
        expression: cdk.Fn.conditionEquals(createDMSRole, "true"),
      }
    );

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

    // IAM Role for LMS S3 Fetch Lambda Execution Role
    const lmsS3FetchRole = new iam.Role(this, "dataeduLMSS3FetchRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "dataedu-fetch-s3-lambda-role",
    });

    // IAM Role for LMS API Fetch Lambda Execution Role
    const lmsAPIFetchRole = new iam.Role(this, "dataeduLMSAPIFetchRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "dataedu-fetch-s3-data-role",
    });

    // Import Event Engine Asset Bucket
    const eeBucket = s3.Bucket.fromBucketName(
      this,
      "dataeduEEBucketName",
      "ee-assets-prod-" + cdk.Stack.of(this).region
    );

    // Create LMS Config Parameter
    const lmsSSMParam = new ssm.StringParameter(this, "dataeduSSMParam", {
      parameterName: "/dataedu/lms-demo/state",
      description: "SSM Parameter for mock LMS integration.",
      stringValue:
        '{"base_url":"ee-assets-prod-' +
        cdk.Stack.of(this).region +
        '.s3.amazonaws.com/modules/cfdd4f678e99415a9c1f11342a3a9887/v1/mockdata/lms_demo","version": "v1", "current_date": "2020-08-17", "perform_initial_load": "1","target_bucket":"' +
        rawBucket.bucketName +
        '", "base_s3_prefix":"lmsapi"}',
    });

    // Create LMS S3 Fetch Lambda Function
    const lmsS3FetchLambda = new lambda.Function(
      this,
      "dataeduLMSS3FetchLambda",
      {
        code: lambda.Code.fromBucket(
          eeBucket,
          "modules/cfdd4f678e99415a9c1f11342a3a9887/v1/lambda/dataedu-fetch-s3-data.zip"
        ),
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "lambda_handler.lambda_handler",
        functionName: "dataedu-fetch-s3-data",
        memorySize: 256,
        timeout: cdk.Duration.seconds(600),
        role: lmsS3FetchRole,
        reservedConcurrentExecutions: 10,
        description:
          "Lambda function that fetches a file from a URL and stores it in a S3 bucket",
      }
    );

    // Add policies to LMS S3 Fetch Lambda Execution Role
    lmsS3FetchRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [rawBucket.bucketArn],
      })
    );
    lmsS3FetchRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [rawBucket.bucketArn + ""],
      })
    );
    lmsS3FetchRole.addToPolicy(
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
            ":log-group:/aws/lambda/dataedu-fetch-s3-data",
        ],
      })
    );

    // Create LMS API Fetch Lambda Function
    const lmsAPIFetchLambda = new lambda.Function(
      this,
      "dataeduLMSAPIFetchLambda",
      {
        code: lambda.Code.fromBucket(
          eeBucket,
          "modules/cfdd4f678e99415a9c1f11342a3a9887/v1/lambda/dataedu-fetch-lmsapi.zip"
        ),
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "lambda_function.lambda_handler",
        functionName: "dataedu-fetch-lmsapi",
        memorySize: 256,
        timeout: cdk.Duration.seconds(600),
        role: lmsAPIFetchRole,
        description:
          "Lambda function that mimics invoking an API to obtain data from a SaaS app",
        reservedConcurrentExecutions: 10,
      }
    );

    // Create EventBridge Rule
    const lmsAPIEventRule = new eb.Rule(this, "dataeduEventBridgeRule", {
      description: "Invokes demo API on a scheduled basis",
      ruleName: "dataedu-lmsapi-sync",
      schedule: eb.Schedule.rate(cdk.Duration.minutes(1)),
      enabled: false,
    });

    // Add Lambda Target to Event Rule
    lmsAPIEventRule.addTarget(new targets.LambdaFunction(lmsAPIFetchLambda));

    // Add policies to LMS API Fetch Lambda Execution Role
    lmsAPIFetchRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:PutParameter", "ssm:GetParameter"],
        resources: [lmsSSMParam.parameterArn],
      })
    );
    lmsAPIFetchRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
        resources: [
          "arn:aws:lambda:" +
            cdk.Stack.of(this).region +
            ":" +
            cdk.Stack.of(this).account +
            ":function:dataedu-*",
        ],
      })
    );
    lmsAPIFetchRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["events:DisableRule"],
        resources: [
          "arn:aws:events:" +
            cdk.Stack.of(this).region +
            ":" +
            cdk.Stack.of(this).account +
            ":rule/dataedu-lmsapi-sync",
        ],
      })
    );
    lmsAPIFetchRole.addToPolicy(
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
            ":log-group:/aws/lambda/dataedu-fetch-lmsapi",
        ],
      })
    );
  }
}
