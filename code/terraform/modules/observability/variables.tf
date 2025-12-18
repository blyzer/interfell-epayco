variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 30
}

variable "enable_detailed_monitoring" {
  type        = bool
  description = "Enable detailed CloudWatch monitoring"
  default     = false
}

variable "alarm_email" {
  type        = string
  description = "Email address for alarm notifications"
}

variable "slack_webhook_url" {
  type        = string
  description = "Slack webhook URL for alerts"
  sensitive   = true
}

variable "dashboard_refresh_interval" {
  type        = number
  description = "Dashboard refresh interval in seconds"
  default     = 300
}

variable "enable_prometheus" {
  type        = bool
  description = "Enable Prometheus monitoring"
  default     = false
}

variable "enable_grafana" {
  type        = bool
  description = "Enable Grafana dashboards"
  default     = false
}
