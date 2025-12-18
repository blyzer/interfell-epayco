variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "sqs_fifo_queues" {
  type = map(object({
    name                              = string
    visibility_timeout_seconds        = number
    message_retention_seconds         = number
    deduplication_scope               = string
    fifo_throughput_limit             = string
    dlq_messages_max_receive_count    = number
  }))
  description = "SQS FIFO queues configuration"
}

variable "sns_topics" {
  type = map(object({
    name = string
  }))
  description = "SNS topics configuration"
}
