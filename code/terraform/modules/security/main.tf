terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

resource "aws_security_group" "alb" {
  name        = "ePayco-alb-sg-${var.environment}"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ePayco-ALB-SG"
  }
}

resource "aws_security_group" "ecs" {
  name        = "ePayco-ecs-sg-${var.environment}"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ePayco-ECS-SG"
  }
}

resource "aws_security_group" "rds" {
  name        = "ePayco-rds-sg-${var.environment}"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ePayco-RDS-SG"
  }
}

resource "aws_security_group" "redis" {
  name        = "ePayco-redis-sg-${var.environment}"
  description = "Security group for Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ePayco-Redis-SG"
  }
}

# ============================================================================
# SECRETS MANAGER
# ============================================================================

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "ePayco/db/password-${var.environment}"
  recovery_window_in_days = 7

  tags = {
    Name = "ePayco-DB-Password"
  }
}

resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "ePayco/api/keys-${var.environment}"
  recovery_window_in_days = 7

  tags = {
    Name = "ePayco-API-Keys"
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "ePayco/jwt/secret-${var.environment}"
  recovery_window_in_days = 7

  tags = {
    Name = "ePayco-JWT-Secret"
  }
}
