import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseCluster;
  public readonly databaseSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // KMS key for encryption (FIPS 140-2 compliant)
    const encryptionKey = new kms.Key(this, 'DatabaseKey', {
      alias: `kg-${props.environment}-db-key`,
      description: 'KMS key for database encryption',
      enableKeyRotation: true,
      removalPolicy:
        props.environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Database credentials secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `kg-${props.environment}/database/credentials`,
      description: 'Database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'kgadmin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // Security group for database
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Aurora PostgreSQL',
      allowAllOutbound: false,
    });

    // Instance configuration based on environment
    const instanceConfig: Record<string, ec2.InstanceType> = {
      dev: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.MEDIUM),
      staging: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
      prod: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE),
    };

    // Aurora PostgreSQL cluster
    this.database = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(this.databaseSecret),

      writer: rds.ClusterInstance.provisioned('Writer', {
        instanceType: instanceConfig[props.environment],
        enablePerformanceInsights: true,
        performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      }),

      readers:
        props.environment === 'prod'
          ? [
              rds.ClusterInstance.provisioned('Reader1', {
                instanceType: instanceConfig[props.environment],
                enablePerformanceInsights: true,
              }),
            ]
          : [],

      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],

      // Storage encryption (FIPS 140-2)
      storageEncrypted: true,
      storageEncryptionKey: encryptionKey,

      // Backup configuration
      backup: {
        retention: cdk.Duration.days(props.environment === 'prod' ? 35 : 7),
        preferredWindow: '03:00-04:00',
      },

      // Deletion protection for prod
      deletionProtection: props.environment === 'prod',
      removalPolicy:
        props.environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,

      // Enhanced monitoring
      monitoringInterval: cdk.Duration.seconds(60),

      // Parameter group with pgvector and age extensions
      parameterGroup: new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_15_4,
        }),
        parameters: {
          'shared_preload_libraries': 'pg_stat_statements,pgaudit',
          'log_statement': 'all',
          'log_connections': '1',
          'log_disconnections': '1',
        },
      }),
    });

    // Allow connections from private subnets
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from VPC'
    );

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'Database endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database secret ARN',
    });
  }
}
