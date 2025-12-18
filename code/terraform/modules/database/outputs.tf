output "db_instance_id" {
  value       = aws_db_instance.main.id
  description = "RDS instance ID"
}

output "db_instance_arn" {
  value       = aws_db_instance.main.arn
  description = "RDS instance ARN"
}

output "rds_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "RDS endpoint address"
  sensitive   = true
}

output "rds_address" {
  value       = aws_db_instance.main.address
  description = "RDS address"
  sensitive   = true
}

output "rds_port" {
  value       = aws_db_instance.main.port
  description = "RDS port"
}

output "rds_database_name" {
  value       = aws_db_instance.main.db_name
  description = "RDS database name"
}

output "rds_username" {
  value       = aws_db_instance.main.username
  description = "RDS master username"
  sensitive   = true
}

output "db_subnet_group_id" {
  value       = aws_db_subnet_group.main.id
  description = "Database subnet group ID"
}

output "db_subnet_group_name" {
  value       = aws_db_subnet_group.main.name
  description = "Database subnet group name"
}

output "parameter_group_id" {
  value       = aws_db_parameter_group.main.id
  description = "Parameter group ID"
}

output "kms_key_id" {
  value       = aws_kms_key.rds.id
  description = "KMS key ID for RDS encryption"
}

output "kms_key_arn" {
  value       = aws_kms_key.rds.arn
  description = "KMS key ARN for RDS encryption"
}
