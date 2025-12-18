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

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for ALB"
}

variable "alb_security_group_id" {
  type        = string
  description = "ALB security group ID"
}

variable "certificate_arn" {
  type        = string
  description = "SSL certificate ARN for HTTPS"
}

variable "domain_name" {
  type        = string
  description = "Domain name for Route53"
}

variable "target_groups" {
  type = map(object({
    port                = number
    health_check_path   = string
  }))
  description = "Target groups configuration"
}
