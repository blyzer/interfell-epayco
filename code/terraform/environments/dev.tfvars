environment                = "dev"
aws_region                 = "us-east-1"
vpc_cidr                   = "10.0.0.0/16"
availability_zones         = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs       = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs        = ["10.0.101.0/24", "10.0.102.0/24"]
enable_nat_gateway         = true
enable_vpc_endpoints       = true
db_instance_class          = "db.t3.micro"
db_allocated_storage       = 20
db_backup_retention_days   = 7
redis_node_type            = "cache.t3.micro"
redis_num_cache_nodes      = 1
log_retention_days         = 7
domain_name                = "ePayco-dev.example.com"
ecr_repository_url         = "123456789.dkr.ecr.us-east-1.amazonaws.com"
acm_certificate_arn        = "arn:aws:acm:us-east-1:123456789:certificate/YOUR-CERT-ID"

services = {
  auth = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-auth:latest"
    cpu                = 256
    memory             = 512
    port               = 3001
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 2
    target_cpu         = 70
    health_check_path  = "/health"
  }
  payment = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-payment:latest"
    cpu                = 512
    memory             = 1024
    port               = 3002
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 3
    target_cpu         = 75
    health_check_path  = "/health"
  }
  wallet = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-wallet:latest"
    cpu                = 512
    memory             = 1024
    port               = 3003
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 2
    target_cpu         = 70
    health_check_path  = "/health"
  }
  fraud = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-fraud:latest"
    cpu                = 256
    memory             = 512
    port               = 3004
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 2
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
    max_tasks          = 2
    target_cpu         = 70
    health_check_path  = "/health"
  }
  notification = {
    image              = "123456789.dkr.ecr.us-east-1.amazonaws.com/ePayco-notification:latest"
    cpu                = 256
    memory             = 512
    port               = 3006
    desired_count      = 1
    min_tasks          = 1
    max_tasks          = 2
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
  ENVIRONMENT           = "dev"
  LOG_LEVEL             = "debug"
  DATABASE_POOL_SIZE    = "5"
  CACHE_TTL             = "300"
  PAYMENT_TIMEOUT       = "30"
}
