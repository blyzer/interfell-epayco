variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "db_password" {
  type        = string
  description = "Database password"
  sensitive   = true
}

variable "api_keys" {
  type        = map(string)
  description = "API keys for external services"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "JWT secret key"
  sensitive   = true
}
