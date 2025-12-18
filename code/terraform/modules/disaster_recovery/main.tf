terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# RDS AUTOMATED BACKUPS
# ============================================================================

resource "aws_db_instance_backup_window" "main" {
  db_instance_identifier = var.db_instance_identifier
  backup_window          = "03:00-04:00"
  backup_retention_period = var.backup_retention_days
  copy_tags_to_snapshot  = true
  delete_automated_backups = false
  storage_encrypted      = true
  enable_iam_database_authentication = true

  tags = {
    Name = "ePayco-RDS-Backup-Window"
  }
}

# ============================================================================
# RDS ENHANCED MONITORING
# ============================================================================

resource "aws_db_instance_monitoring" "main" {
  db_instance_identifier = var.db_instance_identifier
  monitoring_interval    = 60
  monitoring_role_arn    = aws_iam_role.rds_monitoring.arn
  enable_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]
}

resource "aws_iam_role" "rds_monitoring" {
  name = "ePayco-RDS-Monitoring-Role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================================================
# S3 BACKUP BUCKET
# ============================================================================

resource "aws_s3_bucket" "backups" {
  bucket = "ePayco-backups-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "ePayco-Backups"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ============================================================================
# DATA SOURCE
# ============================================================================

data "aws_caller_identity" "current" {}
