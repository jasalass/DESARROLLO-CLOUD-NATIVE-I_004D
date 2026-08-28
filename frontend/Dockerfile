# Build de producción del SPA, servido después por Nginx.
# Las variables VITE_* de Vite se "hornean" en el build (no son runtime), por eso llegan como
# build-args aquí en vez de variables de entorno del contenedor en ejecución.

FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_AUTH_MODE=mock
ARG VITE_USE_MOCKS=true
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_COGNITO_AUTHORITY
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_ENTRA_AUTHORITY
ARG VITE_ENTRA_CLIENT_ID
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_USE_MOCKS=$VITE_USE_MOCKS \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_COGNITO_AUTHORITY=$VITE_COGNITO_AUTHORITY \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_ENTRA_AUTHORITY=$VITE_ENTRA_AUTHORITY \
    VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
