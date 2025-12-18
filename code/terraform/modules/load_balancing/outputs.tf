output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the load balancer"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "ARN of the load balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "Zone ID of the load balancer"
}

output "target_group_arns" {
  value       = { for k, v in aws_lb_target_group.services : k => v.arn }
  description = "Target group ARNs"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.main.domain_name
  description = "CloudFront distribution domain name"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.main.id
  description = "CloudFront distribution ID"
}

output "cloudfront_zone_id" {
  value       = aws_cloudfront_distribution.main.hosted_zone_id
  description = "CloudFront distribution hosted zone ID"
}

output "waf_acl_arn" {
  value       = aws_wafv2_web_acl.main.arn
  description = "WAF ACL ARN"
}

output "route53_zone_id" {
  value       = data.aws_route53_zone.main.zone_id
  description = "Route53 hosted zone ID"
}
