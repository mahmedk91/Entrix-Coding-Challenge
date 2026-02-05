import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as python from '@aws-cdk/aws-lambda-python-alpha';

export interface EntrixStackProps extends cdk.StackProps {
  environmentName: string;
}

export class EntrixStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EntrixStackProps) {
    super(scope, id, props);

    // order results S3 bucket
    const orderResultsBucket = new s3.Bucket(this, 'OrderResultsBucket', {
      bucketName: `order-results-${props.environmentName}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            }
          ]
        }
      ]
    });

    // DynamoDB table for auditing orders
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: `orders-table-${props.environmentName}`,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: 'record_id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    // post_lambda
    const postLambda = new lambda.Function(this, 'PostLambda', {
      functionName: `post-lambda-${props.environmentName}`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'app.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/post_lambda')),
      environment: {
        TABLE_NAME: ordersTable.tableName
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      logGroup: new logs.LogGroup(this, 'PostLambdaLogGroup', {
        logGroupName: `/aws/lambda/post-lambda-${props.environmentName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    ordersTable.grantWriteData(postLambda);

    const api = new apigateway.RestApi(this, 'OrdersApi', {
      restApiName: `orders-api-${props.environmentName}`,
      description: 'API for processing order submissions',
      deployOptions: {
        stageName: props.environmentName,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
    });

    const ordersResource = api.root.addResource('orders');
    ordersResource.addMethod('POST', new apigateway.LambdaIntegration(postLambda));

    // lambda_a
    new lambda.Function(this, 'LambdaA', {
      functionName: `lambda-a-${props.environmentName}`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'app.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda_a')),
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      logGroup: new logs.LogGroup(this, 'LambdaALogGroup', {
        logGroupName: `/aws/lambda/lambda-a-${props.environmentName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // lambda_b
    const lambdaB = new python.PythonFunction(this, 'LambdaB', {
      functionName: `lambda-b-${props.environmentName}`,
      entry: path.join(__dirname, '../../src/lambda_b'),
      runtime: lambda.Runtime.PYTHON_3_14,
      index: 'app.py',
      handler: 'lambda_handler',
      environment: {
        LOG_BUCKET: orderResultsBucket.bucketName
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      logGroup: new logs.LogGroup(this, 'LambdaBLogGroup', {
        logGroupName: `/aws/lambda/lambda-b-${props.environmentName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    orderResultsBucket.grantWrite(lambdaB);
  }
}
