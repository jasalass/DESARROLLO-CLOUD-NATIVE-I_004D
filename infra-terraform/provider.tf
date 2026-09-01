# Plantilla de la infraestructura de SubastaLive (Etapa 1), pensada para recrearse de cero en un
# laboratorio nuevo de AWS Academy. No importa nada de una cuenta existente — crea todo desde cero.
# Ver docs/despliegue-aws.md para el detalle de cada decision y los gotchas reales encontrados al
# construir esto a mano por consola, la primera vez.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
