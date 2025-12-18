variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for ECS tasks"
}

variable "ecs_security_group_id" {
  type        = string
  description = "ECS security group ID"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
}

variable "services" {
  type = map(object({
    image              = string
    cpu                = number
    memory             = number
    port               = number
    desired_count      = number
    min_tasks          = number
    max_tasks          = number
    target_cpu         = number
    health_check_path  = string
  }))
  description = "ECS services configuration"
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for ECS tasks"
}
