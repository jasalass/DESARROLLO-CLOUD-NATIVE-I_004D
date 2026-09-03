# Cluster de ECS + las 4 Task Definitions + los 4 Services. Los tres microservicios validan JWT real
# desde el arranque (JWT_ISSUER_URI_COGNITO/ENTRA ya están disponibles antes de crear la Task
# Definition, a diferencia de la primera vez a mano, donde Cognito no existía todavía y hubo que
# empezar con el perfil "local" y migrar después — ver docs/despliegue-aws.md sección 9).

resource "aws_ecs_cluster" "subastalive" {
  name = "${var.project_name}-cluster"
}

resource "aws_cloudwatch_log_group" "pujas" {
  name              = "/ecs/${var.project_name}-ms-pujas"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "catalogo" {
  name              = "/ecs/${var.project_name}-ms-catalogo"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "usuarios" {
  name              = "/ecs/${var.project_name}-ms-usuarios"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-frontend"
  retention_in_days = 7
}

# ---------- ms-pujas ----------

resource "aws_ecs_task_definition" "pujas" {
  family                   = "${var.project_name}-ms-pujas"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  task_role_arn            = data.aws_iam_role.lab_role.arn
  execution_role_arn       = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name      = "ms-pujas"
      image     = "${aws_ecr_repository.pujas.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 8083, protocol = "tcp" }
      ]
      environment = [
        { name = "SERVER_PORT", value = "8083" },
        { name = "DB_HOST", value = aws_db_instance.subastalive.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = "subastalive" },
        { name = "DB_USERNAME", value = "subastalive" },
        { name = "DB_PASSWORD", value = var.db_master_password },
        { name = "DB_POOL_MAX_SIZE", value = "5" },
        { name = "MS_CATALOGO_BASE_URL", value = "http://${aws_lb.subastalive.dns_name}" },
        { name = "JWT_ISSUER_URI_COGNITO", value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.postores.id}" },
        { name = "JWT_ISSUER_URI_ENTRA", value = "https://login.microsoftonline.com/${var.entra_tenant_id}/v2.0" },
        { name = "ALLOWED_ORIGIN", value = "https://${aws_lb.frontend.dns_name}" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.pujas.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "pujas" {
  name            = "ms-pujas"
  cluster         = aws_ecs_cluster.subastalive.id
  task_definition = aws_ecs_task_definition.pujas.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Spring Boot tarda ~90s en arrancar (JPA + Flyway + pool de conexiones). Sin este margen, el ALB
  # reprueba la tarea antes de que esté lista y ECS revierte solo al despliegue anterior en un loop.
  health_check_grace_period_seconds = 240

  network_configuration {
    subnets          = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.pujas.arn
    container_name   = "ms-pujas"
    container_port   = 8083
  }

  depends_on = [aws_lb_listener.subastalive_http]
}

# ---------- ms-catalogo ----------

resource "aws_ecs_task_definition" "catalogo" {
  family                   = "${var.project_name}-ms-catalogo"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  task_role_arn            = data.aws_iam_role.lab_role.arn
  execution_role_arn       = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name      = "ms-catalogo"
      image     = "${aws_ecr_repository.catalogo.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 8082, protocol = "tcp" }
      ]
      environment = [
        { name = "SERVER_PORT", value = "8082" },
        { name = "DB_HOST", value = aws_db_instance.subastalive.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = "subastalive" },
        { name = "DB_USERNAME", value = "subastalive" },
        { name = "DB_PASSWORD", value = var.db_master_password },
        { name = "DB_POOL_MAX_SIZE", value = "5" },
        { name = "MS_PUJAS_BASE_URL", value = "http://${aws_lb.subastalive.dns_name}" },
        { name = "JWT_ISSUER_URI_COGNITO", value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.postores.id}" },
        { name = "JWT_ISSUER_URI_ENTRA", value = "https://login.microsoftonline.com/${var.entra_tenant_id}/v2.0" },
        { name = "ALLOWED_ORIGIN", value = "https://${aws_lb.frontend.dns_name}" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.catalogo.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "catalogo" {
  name            = "ms-catalogo"
  cluster         = aws_ecs_cluster.subastalive.id
  task_definition = aws_ecs_task_definition.catalogo.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Spring Boot tarda ~90s en arrancar (JPA + Flyway + pool de conexiones), mismo motivo que ms-pujas.
  health_check_grace_period_seconds = 240

  network_configuration {
    subnets          = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.catalogo.arn
    container_name   = "ms-catalogo"
    container_port   = 8082
  }

  depends_on = [aws_lb_listener.subastalive_http]
}

# ---------- ms-usuarios ----------

resource "aws_ecs_task_definition" "usuarios" {
  family                   = "${var.project_name}-ms-usuarios"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  task_role_arn            = data.aws_iam_role.lab_role.arn
  execution_role_arn       = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name      = "ms-usuarios"
      image     = "${aws_ecr_repository.usuarios.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 8081, protocol = "tcp" }
      ]
      environment = [
        { name = "SERVER_PORT", value = "8081" },
        { name = "DB_HOST", value = aws_db_instance.subastalive.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = "subastalive" },
        { name = "DB_USERNAME", value = "subastalive" },
        { name = "DB_PASSWORD", value = var.db_master_password },
        { name = "DB_POOL_MAX_SIZE", value = "5" },
        # RDS exige TLS y el driver "pg" de Node no lo activa solo — sin esto falla con
        # "no pg_hba.conf entry ... no encryption" (ver ms-usuarios/db.js y despliegue-aws.md, sección 12).
        { name = "DB_SSL", value = "true" },
        { name = "MS_PUJAS_BASE_URL", value = "http://${aws_lb.subastalive.dns_name}" },
        { name = "JWT_ISSUER_URI_COGNITO", value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.postores.id}" },
        { name = "JWT_ISSUER_URI_ENTRA", value = "https://login.microsoftonline.com/${var.entra_tenant_id}/v2.0" },
        { name = "ALLOWED_ORIGIN", value = "https://${aws_lb.frontend.dns_name}" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.usuarios.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "usuarios" {
  name            = "ms-usuarios"
  cluster         = aws_ecs_cluster.subastalive.id
  task_definition = aws_ecs_task_definition.usuarios.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Node/Express arranca casi al instante, a diferencia de Spring Boot — no necesita el mismo margen
  # que ms-pujas/ms-catalogo, ni siquiera con la verificación del esquema al arrancar (db.js).
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets         = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups = [aws_security_group.ecs.id]
    # Explícitamente en false: la cuenta real donde se construyó esto a mano quedó con "true" por un
    # error de configuración detectado durante un import de Terraform — este archivo es la referencia
    # correcta, no la que replica ese error.
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.usuarios.arn
    container_name   = "ms-usuarios"
    container_port   = 8081
  }

  depends_on = [aws_lb_listener.subastalive_http]
}

# ---------- frontend ----------

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  task_role_arn            = data.aws_iam_role.lab_role.arn
  execution_role_arn       = data.aws_iam_role.lab_role.arn

  # Sin variables de entorno: las VITE_* del frontend son de build (Vite las incrusta en el bundle),
  # no de runtime — quedan fijas en la imagen que sube GitHub Actions, no se pasan aquí.
  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 80, protocol = "tcp" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "frontend" {
  name            = "frontend"
  cluster         = aws_ecs_cluster.subastalive.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups  = [aws_security_group.frontend_ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.frontend_https]
}
