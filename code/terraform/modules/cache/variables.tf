variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "node_type" {
  type        = string
  description = "ElastiCache node type"
}

variable "num_cache_clusters" {
  type        = number
  description = "Number of cache clusters"
}

variable "engine_version" {
  type        = string
  description = "Redis engine version"
}

variable "cache_subnet_ids" {
  type        = list(string)
  description = "Cache subnet IDs"
}

variable "cache_security_group_id" {
  type        = string
  description = "Cache security group ID"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones for cache cluster"
}
