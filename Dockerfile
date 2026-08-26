ARG NODE_VERSION=22.12.0-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite variables are compiled into the browser bundle. The env file is mounted
# as a BuildKit secret so the source file itself is never copied into a layer.
RUN --mount=type=secret,id=admin_env,target=/run/secrets/admin_env \
    cp /run/secrets/admin_env .env.production \
    && npm run build \
    && rm -f .env .env.local .env.production .env.development \
      .env.development.local .env.production.local

FROM nginx:alpine AS runner

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
