import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EntrixStack } from '../lib/entrix-stack';

describe('EntrixStack', () => {
  let app: cdk.App;
  let stack: EntrixStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new EntrixStack(app, 'TestStack', {
      environmentName: 'test',
      env: {
        account: '123456789012',
        region: 'eu-west-1'
      }
    });
    template = Template.fromStack(stack);
  });

  test('DynamoDB Table Created with TTL', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl'
      }
    });
  });

  test('Post Lambda Has DynamoDB Table Environment Variable', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'post-lambda-test',
      Runtime: 'python3.14',
      Environment: {
        Variables: {
          TABLE_NAME: {}
        }
      }
    });
  });

  test('API Gateway Created', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'orders-api-test'
    });
  });
});
