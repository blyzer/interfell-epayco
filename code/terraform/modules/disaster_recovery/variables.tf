variable "environment" {
  type        = string
  description = "Environment name"
}

variable "db_instance_identifier" {
  type        = string
  description = "RDS instance identifier"
}

variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups"
  default     = 30
}

variable "enable_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = true
}

variable "enable_cross_region_replica" {
  type        = bool
  description = "Enable cross-region read replica"
  default     = false
}

variable "replica_region" {
  type        = string
  description = "Region for read replica"
  default     = "us-west-2"
}
