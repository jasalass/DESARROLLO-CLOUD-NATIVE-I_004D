# Un solo ALB compartido para los 3 microservicios backend (con enrutamiento por path), y un ALB
# propio para el frontend (con HTTPS, porque Cognito/Entra ID lo exigen). Ver docs/despliegue-aws.md
# sección 12 para la razón completa de por qué no es un ALB por microservicio.

# ---------- ALB compartido de los backends ----------

resource "aws_lb" "subastalive" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1a.id, aws_subnet.public_1b.id]

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "pujas" {
  name        = "${var.project_name}-tg-pujas"
  port        = 8083
  protocol    = "HTTP"
  vpc_id      = aws_vpc.subastalive.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "catalogo" {
  name        = "${var.project_name}-tg-catalogo"
  port        = 8082
  protocol    = "HTTP"
  vpc_id      = aws_vpc.subastalive.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "usuarios" {
  name        = "${var.project_name}-tg-usuarios"
  port        = 8081
  protocol    = "HTTP"
  vpc_id      = aws_vpc.subastalive.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }
}

resource "aws_lb_listener" "subastalive_http" {
  load_balancer_arn = aws_lb.subastalive.arn
  port              = 80
  protocol          = "HTTP"

  # Regla por defecto: todo lo que no matchee ruta-catalogo ni ruta-usuarios cae aquí (incluye /pujas).
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.pujas.arn
  }
}

resource "aws_lb_listener_rule" "catalogo" {
  listener_arn = aws_lb_listener.subastalive_http.arn
  priority     = 2

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.catalogo.arn
  }

  condition {
    path_pattern {
      values = ["/subastas*", "/lotes*"]
    }
  }
}

resource "aws_lb_listener_rule" "usuarios" {
  listener_arn = aws_lb_listener.subastalive_http.arn
  priority     = 3

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.usuarios.arn
  }

  condition {
    path_pattern {
      values = ["/usuarios*"]
    }
  }
}

# ---------- ALB propio del frontend, con HTTPS ----------

resource "aws_lb" "frontend" {
  name               = "${var.project_name}-frontend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.frontend_alb.id]
  subnets            = [aws_subnet.public_1a.id, aws_subnet.public_1b.id]

  tags = {
    Name = "${var.project_name}-frontend-alb"
  }
}

resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-tg-frontend"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.subastalive.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }
}

# HTTP redirige a HTTPS — Cognito/Entra ID rechazan cualquier callback que no sea https:// o localhost,
# y crypto.subtle (que necesita el flujo PKCE) no está disponible fuera de un contexto seguro.
resource "aws_lb_listener" "frontend_http" {
  load_balancer_arn = aws_lb.frontend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "frontend_https" {
  load_balancer_arn = aws_lb.frontend.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.frontend.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}
