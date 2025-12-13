#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

const app = new cdk.App();

// Get environment from context
const environment = app.node.tryGetContext('environment') || 'dev';

// Environment configuration
const envConfig: Record<string, cdk.Environment> = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-gov-west-1', // GovCloud region
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-gov-west-1',
  },
  prod: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-gov-west-1',
  },
};

const env = envConfig[environment];

// Tags applied to all resources
const tags: Record<string, string> = {
  Project: 'KnowledgeGraph',
  Environment: environment,
  ManagedBy: 'CDK',
  Compliance: 'IL6-CMMC',
};

// Create stacks
const networkStack = new NetworkStack(app, `KG-Network-${environment}`, {
  env,
  environment,
  tags,
});

const databaseStack = new DatabaseStack(app, `KG-Database-${environment}`, {
  env,
  environment,
  vpc: networkStack.vpc,
  tags,
});

const computeStack = new ComputeStack(app, `KG-Compute-${environment}`, {
  env,
  environment,
  vpc: networkStack.vpc,
  database: databaseStack.database,
  tags,
});

const monitoringStack = new MonitoringStack(app, `KG-Monitoring-${environment}`, {
  env,
  environment,
  cluster: computeStack.cluster,
  tags,
});

// Add stack dependencies
databaseStack.addDependency(networkStack);
computeStack.addDependency(databaseStack);
monitoringStack.addDependency(computeStack);
