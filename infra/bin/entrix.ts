#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { EntrixStack } from '../lib/entrix-stack';

const app = new cdk.App();

const env = {
  account: '054522428175',
  region: 'eu-west-1'
};

new EntrixStack(app, 'EntrixStack', {
  env,
  environmentName: 'dev',
});
