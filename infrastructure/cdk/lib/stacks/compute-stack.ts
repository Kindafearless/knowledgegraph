import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  database: rds.DatabaseCluster;
}

export class ComputeStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `kg-${props.environment}-users`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy:
        props.environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('WebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: `kg-${props.environment}`,
      containerInsights: true,
    });

    // ECR Repositories
    const repositories = ['web', 'auth-service', 'graph-service', 'llm-service', 'ccv-service'];
    const ecrRepos: Record<string, ecr.Repository> = {};

    for (const name of repositories) {
      ecrRepos[name] = new ecr.Repository(this, `ECR-${name}`, {
        repositoryName: `kg-${props.environment}/${name}`,
        removalPolicy:
          props.environment === 'prod'
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY,
        imageScanOnPush: true,
        lifecycleRules: [
          {
            maxImageCount: 10,
            rulePriority: 1,
            description: 'Keep only 10 images',
          },
        ],
      });
    }

    // Application Load Balancer
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // HTTPS Listener (would need certificate in production)
    const httpsListener = this.alb.addListener('HTTPSListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      // certificates: [certificate], // Add ACM certificate for production
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Not Found',
      }),
    });

    // HTTP redirect to HTTPS
    this.alb.addListener('HTTPListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // Task execution role
    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    // Task role with Bedrock access
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Bedrock permissions for LLM service
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'], // Scope to specific models in production
      })
    );

    // Create services
    this.createFargateService({
      name: 'web',
      cluster: this.cluster,
      repository: ecrRepos['web'],
      port: 3000,
      cpu: 512,
      memory: 1024,
      listener: httpsListener,
      priority: 1,
      pathPattern: '/*',
      executionRole,
      taskRole,
      environment: props.environment,
      healthCheckPath: '/api/health',
    });

    this.createFargateService({
      name: 'auth-service',
      cluster: this.cluster,
      repository: ecrRepos['auth-service'],
      port: 8080,
      cpu: 256,
      memory: 512,
      listener: httpsListener,
      priority: 10,
      pathPattern: '/api/v1/auth/*',
      executionRole,
      taskRole,
      environment: props.environment,
      healthCheckPath: '/health',
    });

    this.createFargateService({
      name: 'graph-service',
      cluster: this.cluster,
      repository: ecrRepos['graph-service'],
      port: 8001,
      cpu: 1024,
      memory: 2048,
      listener: httpsListener,
      priority: 20,
      pathPattern: '/api/v1/graph/*',
      executionRole,
      taskRole,
      environment: props.environment,
      healthCheckPath: '/health',
    });

    this.createFargateService({
      name: 'llm-service',
      cluster: this.cluster,
      repository: ecrRepos['llm-service'],
      port: 8002,
      cpu: 1024,
      memory: 4096,
      listener: httpsListener,
      priority: 30,
      pathPattern: '/api/v1/chat/*',
      executionRole,
      taskRole,
      environment: props.environment,
      healthCheckPath: '/health',
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.alb.loadBalancerDnsName,
      description: 'Load balancer DNS name',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }

  private createFargateService(config: {
    name: string;
    cluster: ecs.Cluster;
    repository: ecr.Repository;
    port: number;
    cpu: number;
    memory: number;
    listener: elbv2.ApplicationListener;
    priority: number;
    pathPattern: string;
    executionRole: iam.Role;
    taskRole: iam.Role;
    environment: string;
    healthCheckPath: string;
  }): ecs.FargateService {
    // Log group
    const logGroup = new logs.LogGroup(this, `LogGroup-${config.name}`, {
      logGroupName: `/kg/${config.environment}/${config.name}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy:
        config.environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Task definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      `TaskDef-${config.name}`,
      {
        cpu: config.cpu,
        memoryLimitMiB: config.memory,
        executionRole: config.executionRole,
        taskRole: config.taskRole,
      }
    );

    taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromEcrRepository(config.repository, 'latest'),
      portMappings: [{ containerPort: config.port }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: config.name,
        logGroup,
      }),
      environment: {
        ENVIRONMENT: config.environment,
        PORT: config.port.toString(),
      },
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${config.port}${config.healthCheckPath} || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Fargate service
    const service = new ecs.FargateService(this, `Service-${config.name}`, {
      cluster: config.cluster,
      taskDefinition,
      desiredCount: config.environment === 'prod' ? 2 : 1,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { rollback: true },
    });

    // Auto-scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: config.environment === 'prod' ? 2 : 1,
      maxCapacity: config.environment === 'prod' ? 10 : 4,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Target group
    const targetGroup = new elbv2.ApplicationTargetGroup(
      this,
      `TG-${config.name}`,
      {
        vpc: config.cluster.vpc,
        port: config.port,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targets: [service],
        healthCheck: {
          path: config.healthCheckPath,
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      }
    );

    // Listener rule
    config.listener.addTargetGroups(`Rule-${config.name}`, {
      targetGroups: [targetGroup],
      priority: config.priority,
      conditions: [elbv2.ListenerCondition.pathPatterns([config.pathPattern])],
    });

    return service;
  }
}
