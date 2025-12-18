output "sqs_queue_urls" {
  value       = { for k, v in aws_sqs_queue.fifo_queues : k => v.url }
  description = "SQS queue URLs"
}

output "sqs_queue_arns" {
  value       = { for k, v in aws_sqs_queue.fifo_queues : k => v.arn }
  description = "SQS queue ARNs"
}

output "payment_queue_url" {
  value       = aws_sqs_queue.fifo_queues["payment_queue"].url
  description = "Payment queue URL"
}

output "payment_queue_arn" {
  value       = aws_sqs_queue.fifo_queues["payment_queue"].arn
  description = "Payment queue ARN"
}

output "sqs_dlq_urls" {
  value       = { for k, v in aws_sqs_queue.fifo_dlq : k => v.url }
  description = "SQS Dead Letter Queue URLs"
}

output "sqs_dlq_arns" {
  value       = { for k, v in aws_sqs_queue.fifo_dlq : k => v.arn }
  description = "SQS Dead Letter Queue ARNs"
}

output "sns_topic_arns" {
  value       = { for k, v in aws_sns_topic.main : k => v.arn }
  description = "SNS topic ARNs"
}

output "wallet_events_topic_arn" {
  value       = aws_sns_topic.main["wallet_events"].arn
  description = "Wallet events topic ARN"
}

output "fraud_events_topic_arn" {
  value       = aws_sns_topic.main["fraud_events"].arn
  description = "Fraud events topic ARN"
}

output "payment_events_topic_arn" {
  value       = aws_sns_topic.main["payment_events"].arn
  description = "Payment events topic ARN"
}

output "notification_events_topic_arn" {
  value       = aws_sns_topic.main["notification_events"].arn
  description = "Notification events topic ARN"
}

output "sns_topic_names" {
  value       = { for k, v in aws_sns_topic.main : k => v.name }
  description = "SNS topic names"
}
