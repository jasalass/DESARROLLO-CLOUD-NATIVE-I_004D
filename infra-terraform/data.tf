# Valores que Terraform resuelve consultando la cuenta/región activa en el momento de aplicar — nunca
# hardcodeados, porque cambian de una cuenta de laboratorio a otra.

data "aws_caller_identity" "current" {}

# Los nombres de AZ ("us-east-1a", "us-east-1f", etc.) están mezclados de forma distinta por cada
# cuenta de AWS — lo que tu cuenta llama "us-east-1a" puede ser una AZ física distinta en la cuenta de
# un compañero. Pedirle a AWS la lista de AZs disponibles en el momento evita fijar una AZ que quizás
# ni siquiera exista (o esté restringida) en la cuenta donde se corra esto.
data "aws_availability_zones" "available" {
  state = "available"
}

# AWS Academy Learner Lab no permite crear roles IAM propios — todas las tareas de ECS deben usar el
# rol ya provisto por el laboratorio, "LabRole". Si esto se corriera fuera de un Learner Lab, habría
# que reemplazar cada referencia a este data source por un aws_iam_role real.
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
