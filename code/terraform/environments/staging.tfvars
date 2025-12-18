environment                = "staging"
aws_region                 = "us-east-1"
vpc_cidr                   = "10.1.0.0/16"
availability_zones         = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs       = ["10.1.1.0/24", "10.1.2.0/24"]
public_subnet_cidrs        = ["10.1.101.0/24", "10.1.102.0/24"]
enable_nat_gateway         = true
enable_vpc_endpoints       = true
db_instance_class          = "db.t3.small"
db_allocated_storage       = 50
db_backup_retention_days   = 14
redis_node_type            = "cache.t3.small"
redis_num_cache_nodes      = 2
log_retention_days         = 14
domain_name                = "ePayco-staging.example.com"
ecr_repository_url         = "123456789.dkr.ecr.us-east-1.amazonaws.com"
acm_certificate_arn        = "arn:aws:acm:us-east-1:123456789:certificate/YOUR-CERT-ID"

services = {
  auth = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-auth:latest"
    cpu                = 512
    memory             = 1024
    port               = 3001
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 4
    target_cpu         = 70
    health_check_path  = "/health"
  }
  payment = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-payment:latest"
    cpu                = 512
    memory             = 1024
    port               = 3002
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 5
    target_cpu         = 75
    health_check_path  = "/health"
  }
  wallet = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-wallet:latest"
    cpu                = 512
    memory             = 1024
    port               = 3003
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 4
    target_cpu         = 70
    health_check_path  = "/health"
  }
  fraud = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-fraud:latest"
    cpu                = 512
    memory             = 1024
    port               = 3004
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 4
    target_cpu         = 80
    health_check_path  = "/health"
  }
  merchant = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-merchant:latest"
    cpu                = 256
    memory             = 512
    port               = 3005
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 3
    target_cpu         = 70
    health_check_path  = "/health"
  }
  notification = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-notification:latest"
    cpu                = 512
    memory             = 1024
    port               = 3006
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 4
    target_cpu         = 70
    health_check_path  = "/health"
  }
  audit = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-audit:latest"
    cpu                = 256
    memory             = 512
    port               = 3007
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 2
    target_cpu         = 70
    health_check_path  = "/health"
  }
}

target_groups = {
  auth = {
    port                = 3001
    health_check_path   = "/health"
  }
  payment = {
    port                = 3002
    health_check_path   = "/health"
  }
  wallet = {
    port                = 3003
    health_check_path   = "/health"
  }
  fraud = {
    port                = 3004
    health_check_path   = "/health"
  }
  merchant = {
    port                = 3005
    health_check_path   = "/health"
  }
  notification = {
    port
