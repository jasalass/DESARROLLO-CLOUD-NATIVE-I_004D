# Certificado autofirmado para el ALB del frontend. No hay forma de conseguir un certificado público
# confiable sin dominio propio, y CloudFront (que regalaría uno gratis) está bloqueado por completo en
# este laboratorio de AWS Academy (cloudfront:CreateDistribution da AccessDenied). El navegador va a
# mostrar una advertencia de "conexión no privada" una vez — Cognito y Entra ID solo exigen que el
# esquema sea https://, no validan que el certificado venga de una autoridad reconocida.
#
# A diferencia de cuando lo hicimos a mano con openssl, acá se genera solo en cada apply, usando el
# DNS del ALB recién creado como CN — no hay ningún paso manual ni archivo que guardar.

resource "tls_private_key" "frontend" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "frontend" {
  private_key_pem = tls_private_key.frontend.private_key_pem

  subject {
    common_name = aws_lb.frontend.dns_name
  }

  validity_period_hours = 24 * 365 * 2

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

resource "aws_acm_certificate" "frontend" {
  private_key      = tls_private_key.frontend.private_key_pem
  certificate_body = tls_self_signed_cert.frontend.cert_pem

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-frontend-cert"
  }
}
