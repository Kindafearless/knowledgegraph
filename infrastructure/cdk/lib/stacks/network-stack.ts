import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  environment: string;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    // Create VPC with IL6-compliant configuration
    this.vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: props.environment === 'prod' ? 2 : 1,

      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],

      // Enable flow logs for compliance
      flowLogs: {
        cloudwatch: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(),
          trafficType: ec2.FlowLogTrafficType.ALL,
        },
      },
    });

    // VPC Endpoints for GovCloud (no internet egress for services)
    this.createVpcEndpoints();

    // Output VPC ID
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });
  }

  private createVpcEndpoints(): void {
    // Gateway endpoints (free)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Interface endpoints (for GovCloud services)
    const interfaceEndpoints = [
      { name: 'ECR-API', service: ec2.InterfaceVpcEndpointAwsService.ECR },
      { name: 'ECR-DKR', service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER },
      { name: 'CloudWatch-Logs', service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS },
      { name: 'Secrets-Manager', service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER },
      { name: 'KMS', service: ec2.InterfaceVpcEndpointAwsService.KMS },
      { name: 'STS', service: ec2.InterfaceVpcEndpointAwsService.STS },
    ];

    for (const endpoint of interfaceEndpoints) {
      this.vpc.addInterfaceEndpoint(endpoint.name, {
        service: endpoint.service,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });
    }

    // Bedrock endpoint (for LLM access without internet)
    // Note: Bedrock endpoint availability varies by region
    try {
      this.vpc.addInterfaceEndpoint('Bedrock-Runtime', {
        service: new ec2.InterfaceVpcEndpointService(
          `com.amazonaws.${this.region}.bedrock-runtime`
        ),
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });
    } catch (e) {
      console.log('Bedrock endpoint not available in this region');
    }
  }
}
