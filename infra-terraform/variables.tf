# Valores que cambian entre laboratorios/ejecuciones. Todo lo que es "elección de diseño" ya fija
# (nombres de recursos, CIDRs, puertos) queda escrito directo en cada archivo — no tiene sentido
# convertir en variable algo que nunca vas a querer cambiar entre laboratorios.

variable "aws_region" {
  description = "Región de AWS donde se despliega todo. AWS Academy suele restringir a una sola región."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo usado en el nombre de todos los recursos."
  type        = string
  default     = "subastalive"
}

variable "db_master_password" {
  description = "Password del usuario maestro de RDS. Nunca se deja fija en el código."
  type        = string
  sensitive   = true
}

variable "cognito_domain_prefix" {
  description = <<-EOT
    Prefijo del dominio del Hosted UI de Cognito (https://<prefijo>.auth.<region>.amazoncognito.com).
    Debe ser único a nivel global en todo AWS, no solo en tu cuenta — si el que elijas ya está tomado,
    Terraform va a fallar al crear este recurso con un error de "already exists" y hay que probar con
    otro. Un truco simple: agregar el Account ID al final (ver el output account_id después del primer
    intento fallido) garantiza unicidad.
  EOT
  type        = string
}
