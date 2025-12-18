environment                = "prod"
aws_region                 = "us-east-1"
vpc_cidr                   = "10.2.0.0/16"
availability_zones         = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnet_cidrs       = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
public_subnet_cidrs        = ["10.2.101.0/24", "10.2.102.0/24", "10.2.103.0/24"]
enable_nat_gateway         = true
enable_vpc_endpoints       = true
db_instance_class          = "db.r6i.xlarge"
db_allocated_storage       = 500
db_backup_retention_days   = 30
redis_node_type            = "cache.r6g.xlarge"
redis_num_cache_nodes      = 3
log_retention_days         = 90
domain_name                = "ePayco.com"
ecr_repository_url         = "123456789.dkr.ecr.us-east-1.amazonaws.com"
acm_certificate_arn        = "arn:aws:acm:us-east-1:123456789:certificate/YOUR-CERT-ID"

services = {
  auth = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-auth:v1.0.0"
    cpu                = 1024
    memory             = 2048
    port               = 3001
    desired_count      = 3
    min_tasks          = 3
    max_tasks          = 10
    target_cpu         = 70
    health_check_path  = "/health"
  }
  payment = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-payment:v1.0.0"
    cpu                = 1024
    memory             = 2048
    port               = 3002
    desired_count      = 5
    min_tasks          = 5
    max_tasks          = 20
    target_cpu         = 75
    health_check_path  = "/health"
  }
  wallet = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-wallet:v1.0.0"
    cpu                = 1024
    memory             = 2048
    port               = 3003
    desired_count      = 4
    min_tasks          = 4
    max_tasks          = 15
    target_cpu         = 70
    health_check_path  = "/health"
  }
  fraud = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-fraud:v1.0.0"
    cpu                = 1024
    memory             = 2048
    port               = 3004
    desired_count      = 3
    min_tasks          = 3
    max_tasks          = 10
    target_cpu         = 80
    health_check_path  = "/health"
  }
  merchant = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-merchant:v1.0.0"
    cpu                = 512
    memory             = 1024
    port               = 3005
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 8
    target_cpu         = 70
    health_check_path  = "/health"
  }
  notification = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-notification:v1.0.0"
    cpu                = 1024
    memory             = 2048
    port               = 3006
    desired_count      = 3
    min_tasks          = 3
    max_tasks          = 10
    target_cpu         = 70
    health_check_path  = "/health"
  }
  audit = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-audit:v1.0.0"
    cpu                = 512
    memory             = 1024
    port               = 3007
    desired_count      = 2
    min_tasks          = 2
    max_tasks          = 5
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
    port                = 3006
    health_check_path   = "/health"
  }
  audit = {
    port                = 3007
    health_check_path   = "/health"
  }
}

sqs_fifo_queues = {
  payment_queue = {
    name                              = "ePayco-payment.fifo"
    visibility_timeout_seconds        = 300
    message_retention_seconds         = 86400
    deduplication_scope               = "messageGroup"
    fifo_throughput_limit             = "perMessageGroupId"
    dlq_messages_max_receive_count    = 3
  }
}

sns_topics = {
  wallet_events = {
    name = "ePayco-wallet-events"
  }
  fraud_events = {
    name = "ePayco-fraud-events"
  }
  payment_events = {
    name = "ePayco-payment-events"
  }
  notification_events = {
    name = "ePayco-notification-events"
  }
}

environment_variables = {
  ENVIRONMENT           = "prod"
  LOG_LEVEL             = "warn"
  DATABASE_POOL_SIZE    = "20"
  CACHE_TTL             = "3600"
  PAYMENT_TIMEOUT       = "30"
}
