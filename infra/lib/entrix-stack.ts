import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface EntrixStackProps extends cdk.StackProps {
  environmentName: string;
}

export class EntrixStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EntrixStackProps) {
    super(scope, id, props);

    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: `orders-table-${props.environmentName}`,
      partitionKey: {
        name: 'record_id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

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
  }
}
