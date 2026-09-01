# Valores que hay que copiar a mano después de un apply: a los Secrets/Variables de GitHub Actions
# (ver README principal, sección CI/CD) y a frontend/.env.local si quieres probar en local.

output "account_id" {
  description = "Account ID de esta cuenta — útil si el cognito_domain_prefix elegido ya está tomado y hay que probar con otro."
  value       = data.aws_caller_identity.current.account_id
}

output "alb_backend_dns_name" {
  description = "DNS del ALB compartido de los 3 microservicios backend."
  value       = aws_lb.subastalive.dns_name
}

output "alb_frontend_dns_name" {
  description = "DNS del ALB del frontend — la URL pública final es https://<esto>."
  value       = aws_lb.frontend.dns_name
}

output "api_gateway_invoke_url" {
  description = "Invoke URL del API Gateway — esto es VITE_API_BASE_URL en el frontend."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.postores.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.frontend.id
}

output "cognito_authority" {
  description = "VITE_COGNITO_AUTHORITY"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.postores.id}"
}

output "cognito_domain" {
  description = "VITE_COGNITO_DOMAIN — necesario para que el logout de Cognito funcione de verdad."
  value       = "https://${aws_cognito_user_pool_domain.postores.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "ecr_repository_urls" {
  value = {
    ms_pujas    = aws_ecr_repository.pujas.repository_url
    ms_catalogo = aws_ecr_repository.catalogo.repository_url
    ms_usuarios = aws_ecr_repository.usuarios.repository_url
    frontend    = aws_ecr_repository.frontend.repository_url
  }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.subastalive.name
}

output "rds_endpoint" {
  value = aws_db_instance.subastalive.address
}
