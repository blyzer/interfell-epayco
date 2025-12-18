output "cluster_id" {
  value       = aws_elasticache_cluster.main.id
  description = "ElastiCache cluster ID"
}

output "cluster_address" {
  value       = aws_elasticache_cluster.main.cluster_address
  description = "ElastiCache cluster address"
}

output "redis_primary_endpoint" {
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
  description = "Redis primary endpoint address"
}

output "redis_port" {
  value       = aws_elasticache_cluster.main.port
  description = "Redis port"
}

output "engine_version" {
  value       = aws_elasticache_cluster.main.engine_version
  description = "Redis engine version"
}

output "node_type" {
  value       = aws_elasticache_cluster.main.node_type
  description = "ElastiCache node type"
}

output "num_cache_nodes" {
  value       = aws_elasticache_cluster.main.num_cache_nodes
  description = "Number of cache nodes"
}

output "subnet_group_name" {
  value       = aws_elasticache_subnet_group.main.name
  description = "ElastiCache subnet group name"
}

output "parameter_group_name" {
  value       = aws_elasticache_parameter_group.main.name
  description = "ElastiCache parameter group name"
}

output "redis_auth_token" {
  value       = random_password.redis_auth_token.result
  description = "Redis auth token"
  sensitive   = true
}

output "slow_log_group_name" {
  value       = aws_cloudwatch_log_group.redis_slow_log.name
  description = "CloudWatch log group for Redis slow log"
}

output "engine_log_group_name" {
  value       = aws_cloudwatch_log_group.redis_engine_log.name
  description = "CloudWatch log group for Redis engine log"
}
