// URL base del API Gateway. En local, sin backend real, apunta a un host cualquiera: las llamadas las
// intercepta MSW (ver src/mocks) mientras VITE_USE_MOCKS no sea "false".
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
