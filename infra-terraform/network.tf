# Red: VPC propia con 4 subredes (2 públicas, 2 privadas), NAT Gateway, y las tablas de rutas
# correspondientes. Ver docs/despliegue-aws.md sección 2 para la explicación completa (por qué estos
# CIDRs, por qué hay que fijar la AZ a mano en vez de dejar "sin preferencia", etc.).

resource "aws_vpc" "subastalive" {
  cidr_block           = "172.31.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "subastalive" {
  vpc_id = aws_vpc.subastalive.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Un /16 partido en bloques /20 da 4096 IPs cada uno; cada bloque debe empezar en un múltiplo de 16
# en el tercer octeto (.0, .16, .32, .48) para no solaparse.
resource "aws_subnet" "public_1a" {
  vpc_id                  = aws_vpc.subastalive.id
  cidr_block              = "172.31.0.0/20"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-1a"
  }
}

resource "aws_subnet" "public_1b" {
  vpc_id                  = aws_vpc.subastalive.id
  cidr_block              = "172.31.16.0/20"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-1b"
  }
}

resource "aws_subnet" "private_1a" {
  vpc_id            = aws_vpc.subastalive.id
  cidr_block        = "172.31.32.0/20"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.project_name}-private-1a"
  }
}

resource "aws_subnet" "private_1b" {
  vpc_id            = aws_vpc.subastalive.id
  cidr_block        = "172.31.48.0/20"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.project_name}-private-1b"
  }
}

# El NAT vive en una subred pública y presta salida a internet a las privadas (para que las tareas de
# ECS puedan descargar su imagen de ECR sin tener IP pública).
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

resource "aws_nat_gateway" "subastalive" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1a.id

  tags = {
    Name = "${var.project_name}-nat"
  }

  depends_on = [aws_internet_gateway.subastalive]
}

# La tabla de rutas principal de la VPC ya trae 0.0.0.0/0 -> Internet Gateway por defecto (AWS la crea
# así), así que basta con asociarle las 2 subredes públicas — no hace falta declararla aparte.
resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.public_1a.id
  route_table_id = aws_vpc.subastalive.main_route_table_id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.public_1b.id
  route_table_id = aws_vpc.subastalive.main_route_table_id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.subastalive.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.subastalive.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_1a" {
  subnet_id      = aws_subnet.private_1a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_1b" {
  subnet_id      = aws_subnet.private_1b.id
  route_table_id = aws_route_table.private.id
}
