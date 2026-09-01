# Terraform — plantilla de infraestructura de SubastaLive

Recrea de cero toda la infraestructura de la Etapa 1 que se construyó y probó a mano siguiendo
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md): red privada, RDS, ECR, ECS/Fargate (los 3
microservicios + frontend), los 2 ALB, Cognito, y el API Gateway con autorizador JWT.

**No importa nada de una cuenta existente** — crea todo desde cero en un laboratorio nuevo de AWS
Academy. Si quieres "adoptar" con Terraform una infraestructura que ya armaste a mano en la consola
(en vez de crear una nueva), usa `terraform import` o `-generate-config-out` en vez de aplicar esto
directo — ver la explicación de esa alternativa en el propio hilo de esta conversación / commits.

## Qué NO cubre

- **Microsoft Entra ID** (martillero/administrador) — vive en Azure, fuera del alcance de la cuenta
  de AWS Academy. Se sigue haciendo a mano por el portal de Azure (sección 8 de la guía).
- **GitHub Actions Secrets/Variables** — hay que cargarlos a mano después del `apply`, con los valores
  de los `output` (ver más abajo).
- **Las implementaciones reales de `ms-catalogo`/`ms-usuarios`** — esto crea la infraestructura que
  los recibe, no su código. Los stubs actuales sirven tal cual.

## Uso

1. Instala Terraform ([instrucciones](https://developer.hashicorp.com/terraform/install)) y ten a mano
   las credenciales temporales del laboratorio (panel "AWS Details" de Canvas).

2. Carga las credenciales en tu sesión de terminal (no se guardan en ningún archivo):
   ```powershell
   $env:AWS_ACCESS_KEY_ID = "..."
   $env:AWS_SECRET_ACCESS_KEY = "..."
   $env:AWS_SESSION_TOKEN = "..."
   $env:AWS_DEFAULT_REGION = "us-east-1"
   ```

3. Copia `terraform.tfvars.example` a `terraform.tfvars` y completa el password de RDS y el prefijo de
   dominio de Cognito (debe ser único en todo AWS, no solo en tu cuenta).

4. Inicializa y aplica:
   ```powershell
   terraform init
   terraform apply
   ```
   Confirma con `yes` cuando te lo pida. Tarda varios minutos (RDS y el NAT Gateway son los que más
   demoran en aparecer).

5. Al terminar, copia los valores de `terraform output` a:
   - Los Secrets/Variables de GitHub Actions (ver README principal, sección CI/CD).
   - `frontend/.env.local`, si quieres probar el login real de Cognito en local.

6. Dispara los 4 workflows de GitHub Actions (`Deploy ms-pujas`, `Deploy ms-catalogo`,
   `Deploy ms-usuarios`, `Deploy frontend`) — Terraform crea la infraestructura vacía, pero las
   imágenes reales las sube GitHub Actions, igual que en el proceso manual.

7. Falta Entra ID a mano (sección 8 de la guía) y actualizar sus 2 Variables en GitHub una vez creado.

## Gotchas reales ya resueltos en este código

Todos encontrados construyendo esto a mano la primera vez — ver
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md) para el detalle completo de cada uno:

- El puerto del contenedor en la Task Definition de `ms-pujas` (8083, no el 80 que precarga la
  consola por defecto).
- El grace period de `ms-pujas` en 240s y el umbral saludable del Target Group en 2 — sin esto, ECS
  entra en un loop de rollback automático mientras Spring Boot todavía está arrancando.
- El `/{proxy}` al final de la URL de integración de API Gateway — sin él, ignora el path real de la
  petición.
- El certificado HTTPS del frontend, generado automático con el provider `tls` en cada apply — sin
  esto, Cognito/Entra ID rechazan el callback (exigen `https://` para cualquier dominio que no sea
  `localhost`).
- `ms-usuarios` con `assign_public_ip = false` explícito — la cuenta real donde se hizo esto a mano
  quedó con `true` por error, detectado justamente al hacer el ejercicio de import con Terraform.

## Para limpiar todo

```powershell
terraform destroy
```

Borra todo en el orden correcto solo — no hace falta seguir el orden manual de la sección 13 de la
guía (ese orden es para cuando se apaga desde la consola web).
