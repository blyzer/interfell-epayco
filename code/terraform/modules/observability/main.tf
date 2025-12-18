terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# CLOUDWATCH DASHBOARDS
# ============================================================================

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "ePayco-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ALB Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            ["AWS/ECS", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { stat = "Average" }],
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            ["AWS/RDS", "FreeableMemory", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }],
            ["AWS/ElastiCache", "NetworkBytesIn", { stat = "Sum" }],
            ["AWS/ElastiCache", "NetworkBytesOut", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ElastiCache Metrics"
        }
      }
    ]
  })
}

# ============================================================================
# CLOUDWATCH LOG GROUPS
# ============================================================================

resource "aws_cloudwatch_log_group" "application" {
  name              = "/ePayco/application/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "ePayco-Application-Logs"
  }
}

resource "aws_cloudwatch_log_group" "security" {
  name              = "/ePayco/security/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "ePayco-Security-Logs"
  }
}

# ============================================================================
# CLOUDWATCH ALARMS - GENERAL
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "ePayco-HighErrorRate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "Alert when error rate is high"
  treat_missing_data  = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "low_throughput" {
  alarm_name          = "ePayco-LowThroughput-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when request throughput drops"
  treat_missing_data  = "notBreaching"
}
