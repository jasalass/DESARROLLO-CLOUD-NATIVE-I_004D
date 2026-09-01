# RDS PostgreSQL privada. No tiene ninguna vía de acceso manual — cada microservicio crea y
# actualiza su propio esquema al arrancar con Flyway (o su equivalente en Node), ver db/README.md.

resource "aws_db_subnet_group" "private" {
  name        = "${var.project_name}-private-subnet-group"
  description = "Subredes privadas para RDS de SubastaLive"
  subnet_ids  = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]

  tags = {
    Name = "${var.project_name}-private-subnet-group"
  }
}

resource "aws_db_instance" "subastalive" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "subastalive"
  username = "subastalive"
  password = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.private.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false

  # La master password puede cambiar fuera de Terraform (por ejemplo, si se resetea a mano desde la
  # consola) sin que eso deba considerarse un "cambio a revertir" en el próximo apply.
  lifecycle {
    ignore_changes = [password]
  }

  tags = {
    Name = "${var.project_name}-db"
  }
}
