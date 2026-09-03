# User Pool de Cognito para los postores. Entra ID (martillero/administrador) queda fuera de este
# archivo porque vive en Azure, no en AWS — Terraform sí podría manejarlo con el provider
# "hashicorp/azuread", pero es un laboratorio aparte del de AWS Academy, fuera del alcance de esto.

resource "aws_cognito_user_pool" "postores" {
  name = "${var.project_name}-postores"

  # phone_number NO está en auto_verified_attributes a propósito: si lo estuviera, Cognito exige
  # verificarlo por SMS antes de dejar completar el registro, lo que requiere un origination number
  # de SNS configurado (fuera del alcance de un laboratorio temporal, y no siempre funciona en AWS
  # Academy). Al dejarlo solo como atributo requerido, el Hosted UI pide el teléfono en el
  # formulario de registro, pero lo guarda sin mandar ningún código de verificación.
  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  # ADVERTENCIA: agregar este bloque `schema` a un user pool que YA EXISTE fuerza a Terraform a
  # recrearlo (Cognito no permite cambiar los atributos estándar de un pool después de creado) — eso
  # borra todas las cuentas de postor que ya se hayan registrado. Si este pool ya tiene cuentas de
  # prueba que te importan, expórtalas o vuelve a crearlas después del apply.
  schema {
    name                = "phone_number"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  tags = {
    Name = "${var.project_name}-postores"
  }
}

resource "aws_cognito_user_pool_domain" "postores" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.postores.id
}

resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.project_name}-frontend"
  user_pool_id = aws_cognito_user_pool.postores.id

  # SPA pública — nunca genera client secret, no hay dónde esconderlo en el navegador. La protección
  # contra robo del código de autorización la da PKCE, no un secreto de cliente.
  generate_secret = false

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile", "phone"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = [
    "http://localhost:5173/auth/callback/postor",
    "https://${aws_lb.frontend.dns_name}/auth/callback/postor",
  ]

  logout_urls = [
    "http://localhost:5173",
    "https://${aws_lb.frontend.dns_name}",
  ]
}
