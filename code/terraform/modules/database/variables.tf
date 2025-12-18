variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage in GB"
}

variable "backup_retention_days" {
  type        = number
  description = "Backup retention in days"
}

variable "db_name" {
  type        = string
  description = "Database name"
  sensitive   = true
}

variable "db_username" {
  type        = string
  description = "Database admin username"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database admin password"
  sensitive   = true
}

variable "db_subnet_ids" {
  type        = list(string)
  description = "Database subnet IDs"
}

variable "db_security_group_id" {
  type        = string
  description = "Database security group ID"
}
