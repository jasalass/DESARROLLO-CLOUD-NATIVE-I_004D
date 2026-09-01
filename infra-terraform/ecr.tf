# Un repositorio por cada parte desplegable. GitHub Actions sube las imágenes aquí (ver
# .github/workflows/); Terraform solo crea el repositorio vacío, nunca construye ni sube imágenes.

resource "aws_ecr_repository" "pujas" {
  name                 = "${var.project_name}/ms-pujas"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}

resource "aws_ecr_repository" "catalogo" {
  name                 = "${var.project_name}/ms-catalogo"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}

resource "aws_ecr_repository" "usuarios" {
  name                 = "${var.project_name}/ms-usuarios"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}
