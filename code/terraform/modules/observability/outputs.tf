output "dashboard_url" {
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=ePayco-${var.environment}"
  description = "CloudWatch dashboard URL"
}

output "log_group_application_name" {
  value       = aws_cloudwatch_log_group.application.name
  description = "Application log group name"
}

output "log_group_security_name" {
  value       = aws_cloudwatch_log_group.security.name
  description = "Security log group name"
}
