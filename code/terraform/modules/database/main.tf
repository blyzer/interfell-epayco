terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "ePayco-db-subnet-group-${var.environment}"
  subnet_ids = var.db_subnet_ids

  tags = {
    Name = "ePayco-DB-SubnetGroup"
  }
}

# RDS Instance - PostgreSQL Multi-AZ
resource "aws_db_instance" "main" {
  identifier = "ePayco-postgres-${var.environment}"

  # Engine Configuration
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = var.db_instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn

  # Database Configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # High Availability
  multi_az            = var.environment == "prod" ? true : false
  publicly_accessible = false

  # Backup & Maintenance
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "ePayco-postgres-${var.environment}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]

  # Performance Insights
  performance_insights_enabled    = var.environment == "prod" ? true : false
  performance_insights_retention_period = var.environment == "prod" ? 7 : null
  performance_insights_kms_key_id = var.environment == "prod" ? aws_kms_key.rds.arn : null

  # Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Deletion Protection
  deletion_protection = var.environment == "prod" ? true : false

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name

  # Option Group
  option_group_name = aws_db_option_group.main.name

  tags = {
    Name = "ePayco-PostgreSQL-${var.environment}"
  }

  depends_on = [aws_db_parameter_group.main, aws_db_option_group.main]
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "ePayco-postgres-params-${var.environment}"
  family = "postgres15"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name = "ePayco-DB-ParameterGroup"
  }
}

# DB Option Group
resource "aws_db_option_group" "main" {
  name
