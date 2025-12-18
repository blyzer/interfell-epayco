terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "ePayco-terraform-state-prod-ACCOUNT_ID"
    key            = "ePayco/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ePayco-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ePayco"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# ============================================================================
# NETWORKING MODULE
# ============================================================================

module "networking" {
  source = "./modules/networking"

  environment            = var.environment
  aws_region            = var.aws_region
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  config_bucket         = aws_s3_bucket.config.id
}

# ============================================================================
# DATABASE MODULE
# ============================================================================

module "database" {
  source = "./modules/database"

  environment              = var.environment
  aws_region              = var.aws_region
  db_instance_class       = var.db_instance_class
  allocated_storage       = var.allocated_storage
  backup_retention_days   = var.backup_retention_days
  
  vpc_id                  = module.networking.vpc_id
  db_subnet_ids           = module.networking.db_subnet_ids
  db_security_group_id    = module.networking.db_security_group_id
  
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
}

# ============================================================================
# CACHE MODULE
# ============================================================================

module "cache" {
  source = "./modules/cache"

  environment          = var.environment
  aws_region          = var.aws_region
  node_type           = var.cache_node_type
  num_cache_clusters  = var.cache_num_clusters
  engine_version      = var.cache_engine_version
  
  vpc_id              = module.networking.vpc_id
  cache_subnet_ids    = module.networking.cache_subnet_ids
  cache_security_group_id = module.networking.cache_security_group_id
}

# ============================================================================
# MESSAGING MODULE
# ============================================================================

module "messaging" {
  source = "./modules/messaging"

  environment = var.environment
  aws_region = var.aws_region
  
  sqs_fifo_queues = {
    payment_queue = {
      name                       = "payment-queue.fifo"
      visibility_timeout_seconds = 300
      message_retention_seconds  = 1209600
      deduplication_scope        = "messageGroupId"
      fifo_throughput_limit      = "perMessageGroupId"
      dlq_messages_max_receive_count = 3
    }
  }
  
  sns_topics = {
    wallet_events = {
      name = "wallet-events"
    }
    fraud_events = {
      name = "fraud-events"
    }
    payment_events = {
      name = "payment-events"
    }
    notification_events = {
      name = "notification-events"
    }
  }
}

# ============================================================================
# COMPUTE MODULE (ECS FARGATE)
# ============================================================================

module "compute" {
  source = "./modules/compute"

  environment          = var.environment
  aws_region          = var.aws_region
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.app_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  
  log_retention_days = var.log_retention_days
  
  services = {
    auth = {
      image             = "${var.ecr_repository_url}/auth-service:latest"
      cpu               = 256
      memory            = 512
      port              = 8080
      desired_count     = var.environment == "prod" ? 5 : 1
      min_tasks         = var.environment == "prod" ? 3 : 1
      max_tasks         = var.environment == "prod" ? 20 : 5
      target_cpu        = 70
      health_check_path = "/health"
    }
    wallet = {
      image             = "${var.ecr_repository_url}/wallet-service:latest"
      cpu               = 512
      memory            = 1024
      port              = 8080
      desired_count     = var.environment == "prod" ? 5 : 1
      min_tasks         = var.environment == "prod" ? 3 : 1
      max_tasks         = var.environment == "prod" ? 30 : 5
      target_cpu        = 70
      health_check_path = "/health"
    }
    payment = {
      image             = "${var.ecr_repository_url}/payment-service:latest"
      cpu               = 1024
      memory            = 2048
      port              = 8080
      desired_count     = var.environment == "prod" ? 10 : 2
      min_tasks         = var.environment == "prod" ? 5 : 1
      max_tasks         = var.environment == "prod" ? 50 : 10
      target_cpu        = 75
      health_check_path = "/health"
    }
    fraud = {
      image             = "${var.ecr_repository_url}/fraud-service:latest"
      cpu               = 512
      memory            = 1024
      port              = 8080
      desired_count     = var.environment == "prod" ? 5 : 1
      min_tasks         = var.environment == "prod" ? 2 : 1
      max_tasks         = var.environment == "prod" ? 15 : 5
      target_cpu        = 70
      health_check_path = "/health"
    }
    merchant = {
      image             = "${var.ecr_repository_url}/merchant-service:latest"
      cpu               = 512
      memory            = 1024
      port              = 8080
      desired_count     = var.environment == "prod" ? 3 : 1
      min_tasks         = var.environment == "prod" ? 2 : 1
      max_tasks         = var.environment == "prod" ? 10 : 5
      target_cpu        = 70
      health_check_path = "/health"
    }
    notification = {
      image             = "${var.ecr_repository_url}/notification-service:latest"
      cpu               = 256
      memory            = 512
      port              = 8080
      desired_count     = var.environment == "prod" ? 3 : 1
      min_tasks         = var.environment == "prod" ? 2 : 1
      max_tasks         = var.environment == "prod" ? 10 : 5
      target_cpu        = 70
      health_check_path = "/health"
    }
    audit = {
      image             = "${var.ecr_repository_url}/audit-service:latest"
      cpu               = 256
      memory            = 512
      port              = 8080
      desired_count     = var.environment == "prod" ? 2 : 1
      min_tasks         = var.environment == "prod" ? 1 : 1
      max_tasks         = var.environment == "prod" ? 5 : 3
      target_cpu        = 70
      health_check_path = "/health"
    }
  }
  
  environment_variables = {
    NODE_ENV              = var.environment
    LOG_LEVEL             = var.environment == "prod" ? "info" : "debug"
    AWS_REGION            = var.aws_region
    RDS_ENDPOINT          = module.database.rds_endpoint
    REDIS_ENDPOINT        = module.cache.redis_primary_endpoint
    SQS_QUEUE_URL         = module.messaging.payment_queue_url
  }
}

# ============================================================================
# LOAD BALANCING MODULE (ALB + CloudFront + Route53)
# ============================================================================

module "load_balancing" {
  source = "./modules/load_balancing"

  environment           = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.networking.vpc_id
  public_subnet_ids    = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  
  domain_name      = var.domain_name
  certificate_arn  = var.acm_certificate_arn
  
  target_groups = {
    auth = {
      port              = 8080
      health_check_path = "/health"
    }
    wallet = {
      port              = 8080
      health_check_path = "/health"
    }
    payment = {
      port              = 8080
      health_check_path = "/health"
    }
    fraud = {
      port              = 8080
      health_check_path = "/health"
    }
    merchant = {
      port              = 8080
      health_check_path = "/health"
    }
    notification = {
      port              = 8080
      health_check_path = "/health"
    }
    audit = {
      port              = 8080
      health_check_path = "/health"
    }
  }
}

# ============================================================================
# SECURITY MODULE (IAM + KMS + Secrets)
# ============================================================================

module "security" {
  source = "./modules/security"

  environment = var.environment
}

# ============================================================================
# OBSERVABILITY MODULE (CloudWatch)
# ============================================================================

module "observability" {
  source = "./modules/observability"

  environment = var.environment
  aws_region  = var.aws_region
  
  services = [
    "auth",
    "wallet",
    "payment",
    "fraud",
    "merchant",
    "notification",
    "audit"
  ]
}

# ============================================================================
# DISASTER RECOVERY MODULE
# ============================================================================

module "disaster_recovery" {
  source = "./modules/disaster_recovery"

  count = var.environment == "prod" ? 1 : 0

  environment                    = var.environment
  primary_region                = var.aws_region
  standby_region                = var.disaster_recovery_region
  source_db_instance_identifier = module.database.db_instance_id
  backup_retention_days         = var.backup_retention_days
}

# ============================================================================
# S3 BUCKET FOR DYNAMIC CONFIGURATION
# ============================================================================

resource "aws_s3_bucket" "config" {
  bucket = "ePayco-config-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "ePayco Config Bucket"
  }
}

resource "aws_s3_bucket_versioning" "config" {
  bucket = aws_s3_bucket.config.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  bucket = aws_s3_bucket.config.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "config" {
  bucket = aws_s3_bucket.config.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "aws_caller_identity" "current" {}

# ============================================================================
# OUTPUTS
# ============================================================================

output "vpc_id" {
  value       = module.networking.vpc_id
  description = "VPC ID"
}

output "ecs_cluster_name" {
  value       = module.compute.cluster_name
  description = "ECS Cluster Name"
}

output "alb_dns_name" {
  value       = module.load_balancing.alb_dns_name
  description = "ALB DNS Name"
}

output "cloudfront_domain_name" {
  value       = module.load_balancing.cloudfront_domain_name
  description = "CloudFront Domain Name"
}

output "rds_endpoint" {
  value       = module.database.rds_endpoint
  description = "RDS Endpoint"
  sensitive   = true
}

output "redis_endpoint" {
  value       = module.cache.redis_primary_endpoint
  description = "Redis Primary Endpoint"
}

output "hosted_zone_id" {
  value       = module.load_balancing.hosted_zone_id
  description = "Route53 Hosted Zone ID"
}

output "terraform_state_bucket" {
  value       = aws_s3_bucket.config.id
  description = "S3 bucket for Terraform state"
}
