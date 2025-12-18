output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "vpc_cidr" {
  value       = aws_vpc.main.cidr_block
  description = "VPC CIDR block"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "Public subnet IDs"
}

output "app_subnet_ids" {
  value       = aws_subnet.private_app[*].id
  description = "Private app subnet IDs"
}

output "db_subnet_ids" {
  value       = aws_subnet.private_db[*].id
  description = "Private database subnet IDs"
}

output "cache_subnet_ids" {
  value       = aws_subnet.private_app[*].id
  description = "Cache subnet IDs (same as app subnets)"
}

output "nat_gateway_ips" {
  value       = aws_eip.nat[*].public_ip
  description = "NAT Gateway public IPs"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ALB security group ID"
}

output "ecs_security_group_id" {
  value       = aws_security_group.ecs.id
  description = "ECS security group ID"
}

output "db_security_group_id" {
  value       = aws_security_group.rds.id
  description = "RDS security group ID"
}

output "cache_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Cache security group ID"
}

output "internet_gateway_id" {
  value       = aws_internet_gateway.main.id
  description = "Internet Gateway ID"
}

output "flow_log_group_name" {
  value       = aws_flow_log_group.main.name
  description = "VPC Flow Logs CloudWatch group name"
}
