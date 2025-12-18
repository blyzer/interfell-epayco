output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name"
}

output "cluster_id" {
  value       = aws_ecs_cluster.main.id
  description = "ECS cluster ID"
}

output "cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "ECS cluster ARN"
}

output "service_names" {
  value       = { for k, v in aws_ecs_service.services : k => v.name }
  description = "ECS service names"
}

output "service_arns" {
  value       = { for k, v in aws_ecs_service.services : k => v.arn }
  description = "ECS service ARNs"
}

output "task_definition_arns" {
  value       = { for k, v in aws_ecs_task_definition.services : k => v.arn }
  description = "ECS task definition ARNs"
}

output "log_group_name" {
  value       = aws_cloudwatch_log_group.ecs.name
  description = "CloudWatch log group name for ECS"
}

output "log_group_arn" {
  value       = aws_cloudwatch_log_group.ecs.arn
  description = "CloudWatch log group ARN for ECS"
}

output "ecs_task_execution_role_arn" {
  value       = aws_iam_role.ecs_task_execution_role.arn
  description = "ECS task execution IAM role ARN"
}

output "ecs_task_role_arn" {
  value       = aws_iam_role.ecs_task_role.arn
  description = "ECS task IAM role ARN"
}
