# Security groups. `ecs` es compartido por los 3 microservicios backend (ms-pujas, ms-catalogo,
# ms-usuarios) — no uno por servicio, ver docs/despliegue-aws.md sección 12. El frontend tiene los
# suyos propios porque vive detrás de su propio ALB, con HTTPS.

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "ALB publico de SubastaLive - recibe trafico HTTP desde internet y lo reenvia hacia las tareas de ECS"
  vpc_id      = aws_vpc.subastalive.id

  ingress {
    description = "HTTP publico"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-ecs-sg"
  description = "Tareas de ECS de SubastaLive (microservicios) - solo acepta trafico desde el ALB"
  vpc_id      = aws_vpc.subastalive.id

  ingress {
    description     = "ms-usuarios"
    from_port       = 8081
    to_port         = 8081
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "ms-catalogo"
    from_port       = 8082
    to_port         = 8082
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "ms-pujas"
    from_port       = 8083
    to_port         = 8083
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "RDS privada de SubastaLive - solo acepta trafico desde las tareas de ECS"
  vpc_id      = aws_vpc.subastalive.id

  ingress {
    description     = "Postgres desde las tareas de ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

resource "aws_security_group" "frontend_alb" {
  name        = "${var.project_name}-frontend-alb-sg"
  description = "ALB del frontend de SubastaLive - recibe trafico HTTP y HTTPS desde internet"
  vpc_id      = aws_vpc.subastalive.id

  ingress {
    description = "HTTP publico"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS publico - Cognito y Entra ID exigen https:// en el callback"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-frontend-alb-sg"
  }
}

resource "aws_security_group" "frontend_ecs" {
  name        = "${var.project_name}-frontend-ecs-sg"
  description = "Tarea de ECS del frontend - solo acepta trafico desde su ALB"
  vpc_id      = aws_vpc.subastalive.id

  ingress {
    description     = "Desde el ALB del frontend"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-frontend-ecs-sg"
  }
}
