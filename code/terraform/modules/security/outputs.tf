output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ALB security group ID"
}

output "ecs_security_group_id" {
  value       = aws_security_group.ecs.id
  description = "ECS security group ID"
}

output "rds_security_group_id" {
  value       = aws_security_group.rds.id
  description = "RDS security group ID"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Redis security group ID"
}

output "db_password_secret_arn" {
  value       = aws_secretsmanager_secret.db_password.arn
  description = "Database password secret ARN"
}

output "api_keys_secret_arn" {
  value       = aws_secretsmanager_secret.api_keys.arn
  description = "API keys secret ARN"
}

output "jwt_secret_arn" {
  value       = aws_secretsmanager_secret.jwt_secret.arn
  description = "JWT secret ARN"
}
