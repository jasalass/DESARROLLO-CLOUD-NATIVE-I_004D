# HTTP API con autorizador JWT contra Cognito. Un solo /{proxy+} alcanza para los 3 microservicios,
# porque el ALB compartido ya hace el enrutamiento por path él mismo — el Gateway solo valida el
# token y reenvía tal cual. Ver docs/despliegue-aws.md sección 12, "API Gateway — no hace falta tocar
# nada", con la prueba real de que esto funciona así.

resource "aws_apigatewayv2_api" "subastalive" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "backend" {
  api_id             = aws_apigatewayv2_api.subastalive.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  # El {proxy} al final es obligatorio: sin él, la integración ignora el path real de la petición y
  # reenvía todo a la raíz del ALB, sin importar qué ruta se haya pedido (gotcha real, ver la guía).
  integration_uri        = "http://${aws_lb.subastalive.dns_name}/{proxy}"
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.subastalive.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_postores.id
}

resource "aws_apigatewayv2_authorizer" "cognito_postores" {
  api_id           = aws_apigatewayv2_api.subastalive.id
  authorizer_type  = "JWT"
  name             = "cognito-postores"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.frontend.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.postores.id}"
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.subastalive.id
  name        = "$default"
  auto_deploy = true
}
