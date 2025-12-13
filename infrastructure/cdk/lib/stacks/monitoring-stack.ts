import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  cluster: ecs.Cluster;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `kg-${props.environment}-alerts`,
      displayName: 'Knowledge Graph Alerts',
    });

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `kg-${props.environment}`,
    });

    // ECS Cluster metrics
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# Knowledge Graph Application Metrics',
        width: 24,
        height: 1,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS CPU Utilization',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'CPUUtilization',
            dimensionsMap: {
              ClusterName: props.cluster.clusterName,
            },
            statistic: 'Average',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS Memory Utilization',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'MemoryUtilization',
            dimensionsMap: {
              ClusterName: props.cluster.clusterName,
            },
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // ALB metrics
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '## Load Balancer Metrics',
        width: 24,
        height: 1,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Request Count',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApplicationELB',
            metricName: 'RequestCount',
            statistic: 'Sum',
          }),
        ],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Target Response Time',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApplicationELB',
            metricName: 'TargetResponseTime',
            statistic: 'Average',
          }),
        ],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'HTTP 5xx Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApplicationELB',
            metricName: 'HTTPCode_Target_5XX_Count',
            statistic: 'Sum',
          }),
        ],
        width: 8,
      })
    );

    // Alarms
    // High CPU alarm
    new cloudwatch.Alarm(this, 'HighCPUAlarm', {
      alarmName: `kg-${props.environment}-high-cpu`,
      alarmDescription: 'ECS cluster CPU utilization is high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ClusterName: props.cluster.clusterName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // High memory alarm
    new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      alarmName: `kg-${props.environment}-high-memory`,
      alarmDescription: 'ECS cluster memory utilization is high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          ClusterName: props.cluster.clusterName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 85,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // 5xx error alarm
    new cloudwatch.Alarm(this, 'Http5xxAlarm', {
      alarmName: `kg-${props.environment}-http-5xx`,
      alarmDescription: 'High rate of HTTP 5xx errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_Target_5XX_Count',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Output
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'Alert SNS Topic ARN',
    });
  }
}
