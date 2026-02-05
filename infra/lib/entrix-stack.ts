import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

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
  }
}
