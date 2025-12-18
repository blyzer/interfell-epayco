output "backup_bucket_name" {
  value       = aws_s3_bucket.backups.id
  description = "S3 bucket name for backups"
}

output "backup_bucket_arn" {
  value       = aws_s3_bucket.backups.arn
  description = "S3 bucket ARN for backups"
}

output "rds_monitoring_role_arn" {
  value       = aws_iam_role.rds_monitoring.arn
  description = "RDS monitoring IAM role ARN"
}
