# ============================================================================
# AWS Configuration
# ============================================================================

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "disaster_recovery_region" {
  type        = string
  description = "AWS region for disaster recovery"
  default     = "us-west-2"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# ============================================================================
# VPC & Networking
# ============================================================================

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ============================================================================
# Database Configuration
# ============================================================================

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  
  validation {
    condition     = contains(["db.t4g.medium", "db.m6i.large", "db.m6i.2xlarge"], var.db_instance_class)
    error_message = "db_instance_class must be t4g.medium, m6i.large, or m6i.2xlarge."
  }
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage in GB"
  default     = 100
}

variable "backup_retention_days" {
  type        = number
  description = "Backup retention in days"
  default     = 30
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "epayco"
  sensitive   = true
}

variable "db_username" {
  type        = string
  description = "Database admin username"
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database admin password (minimum 8 characters)"
  sensitive   = true
  
  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

# ============================================================================
# Cache Configuration
# ============================================================================

variable "cache_node_type" {
  type        = string
  description = "ElastiCache node type"
  
  validation {
    condition     = contains(["cache.t4g.micro", "cache.r6g.large", "cache.r7g.xlarge"], var.cache_node_type)
    error_message = "cache_node_type must be t4g.micro, r6g.large, or r7g.xlarge."
  }
}

variable "cache_num_clusters" {
  type        = number
  description = "Number of cache clusters"
  default     = 1
}

variable "cache_engine_version" {
  type        = string
  description = "Redis engine version"
  default     = "7.0"
}

# ============================================================================
# Compute (ECS) Configuration
# ============================================================================

variable "ecr_repository_url" {
  type        = string
  description = "ECR repository URL"
  default     = "123456789.dkr.ecr.us-east-1.amazonaws.com"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 30
}

# ============================================================================
# Load Balancing Configuration
# ============================================================================

variable "domain_name" {
  type        = string
  description = "Domain name for Route53"
  default     = "epayco.com"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for HTTPS"
}

# ============================================================================
# Tags
# ============================================================================

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default = {
    Project     = "ePayco"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }
}
