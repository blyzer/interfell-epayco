terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# SQS FIFO QUEUES
# ============================================================================

resource "aws_sqs_queue" "fifo_queues" {
  for_each = var.sqs_fifo_queues

  name                              = each.value.name
  fifo_queue                        = true
  visibility_timeout_seconds        = each.value.visibility_timeout_seconds
  message_retention_seconds         = each.value.message_retention_seconds
  content_based_deduplication       = true
  deduplication_scope               = each.value.deduplication_scope
  fifo_throughput_limit             = each.value.fifo_throughput_limit
  kms_master_key_id                 = "alias/aws/sqs"
  sqs_managed_sse_enabled           = true
  receive_wait_time_seconds         = 20

  tags = {
    Name = each.key
  }
}

# SQS Dead Letter Queues (DLQ)
resource "aws_sqs_queue" "fifo_dlq" {
  for_each = var.sqs_fifo_queues

  name              = "${each.value.name}-dlq"
  fifo_queue        = true
  message_retention_seconds = 1209600 # 14 days
  content_based_deduplication = true
  kms_master_key_id = "alias/aws/sqs"
  sqs_managed_sse_enabled = true

  tags = {
    Name = "${each.key}-dlq"
  }
}

# SQS Queue Redrive Policy (DLQ association)
resource "aws_sqs_queue_redrive_policy" "fifo_queues" {
  for_each = var.sqs_fifo_queues

  queue_url = aws_sqs_queue.fifo_queues[each.key].id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq[each.key].arn
    maxReceiveCount     = each.value.dlq_messages_max_receive_count
  })
}

# ============================================================================
# SNS TOPICS
# ============================================================================

resource "aws_sns_topic" "main" {
  for_each = var.sns_topics

  name              = each.value.name
  kms_master_key_id = "alias/aws/sns"
  display_name      = "ePayco ${each.key} topic"

  tags = {
    Name = each.key
  }
}

# SNS Topic Policy
resource "aws_sns_topic_policy" "main" {
  for_each = var.sns_topics

  arn = aws_sns_topic.main[each.key].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sqs.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.main[each.key].arn
      }
    ]
  })
}

# ============================================================================
# SNS SUBSCRIPTIONS
# ============================================================================

# Subscribe queues to topics
resource "aws_sns_topic_subscription" "queue_to_topic" {
  for_each = {
    wallet_to_notification = {
      topic_key = "wallet_events"
      queue_key = "payment_queue"
    }
    fraud_to_notification = {
      topic_key = "fraud_events"
      queue_key = "payment_queue"
    }
    payment_to_notification = {
      topic_key = "payment_events"
      queue_key = "payment_queue"
    }
  }

  topic_arn = aws_sns_topic.main[each.value.topic_key].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.fifo_queues[each.value.queue_key].arn

  depends_on = [aws_sns_topic_policy.main]
}

# ============================================================================
# CLOUDWATCH ALARMS FOR SQS
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "sqs_queue_depth" {
  for_each = var.sqs_fifo_queues

  alarm_name          = "ePayco-SQS-${each.key}-QueueDepth-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"
  alarm_description   = "Alert when SQS queue depth exceeds 1000"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.fifo_queues[each.key].name
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  for_each = var.sqs_fifo_queues

  alarm_name          = "ePayco-SQS-${each.key}-DLQ-Messages-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when messages appear in DLQ"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.fifo_dlq[each.key].name
  }
}

# ============================================================================
# CLOUDWATCH ALARMS FOR SNS
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "sns_publish_failures" {
  for_each = var.sns_topics

  alarm_name          = "ePayco-SNS-${each.key}-PublishFailures-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "PublishFailed"
  namespace           = "AWS/SNS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Alert when SNS publish fails"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TopicName = aws_sns_topic.main[each.key].name
  }
}
