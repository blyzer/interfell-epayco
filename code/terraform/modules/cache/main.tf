terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "ePayco-cache-subnet-group-${var.environment}"
  subnet_ids = var.cache_subnet_ids

  tags = {
    Name = "ePayco-Cache-SubnetGroup"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "ePayco-redis-${var.environment}"
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_clusters
  parameter_group_name = aws_elasticache_parameter_group.main.name
  engine_version       = var.engine_version
  port                 = 6379

  # High Availability
  automatic_failover_enabled = var.environment == "prod" ? true : false
  multi_az_enabled           = var.environment == "prod" ? true : false

  # Networking
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [var.cache_security_group_id]
  preferred_availability_zones = var.availability_zones

  # Backup & Maintenance
  snapshot_retention_limit = var.environment == "prod" ? 5 : 0
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "sun:05:00-sun:07:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
    enabled          = true
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
    enabled          = true
  }

  tags = {
    Name = "ePayco-Redis-Cluster"
  }
}

# Redis Auth Token
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family      = "redis7"
  name        = "ePayco-redis-params-${var.environment}"
  description = "Parameter group for ePayco Redis"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "appendonly"
    value = var.environment == "prod" ? "yes" : "no"
  }

  tags = {
    Name = "ePayco-Redis-ParameterGroup"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/redis/slow-log-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "ePayco-Redis-SlowLog"
  }
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/redis/engine-log-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "ePayco-Redis-EngineLog"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "ePayco-Redis-HighCPU-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Alert when Redis CPU exceeds 75%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }
}

resource "aws_cloudwatch_metric_alarm" "evictions" {
  alarm_name          = "ePayco-Redis-Evictions-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when Redis has evictions"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }
}

resource "aws_cloudwatch_metric_alarm" "connection_count" {
  alarm_name          = "ePayco-Redis-HighConnections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrentConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"
  alarm_description   = "Alert when Redis connections exceed 1000"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }
}

resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "ePayco-Redis-ReplicationLag-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "Alert when Redis replication lag exceeds 5 seconds"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }
}
