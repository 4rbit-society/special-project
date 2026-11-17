FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS source
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

FROM source AS backend-build
RUN npm run build -w @starter/shared \
    && ./node_modules/.bin/tsc -p apps/api/tsconfig.docker.json

FROM source AS frontend-build
ENV VITE_API_BASE_URL=""
RUN npm run build -w @starter/shared && npm run build -w @starter/web

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS backend
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=backend-build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=backend-build /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-build /app/apps/api/package.json ./apps/api/package.json
COPY --from=backend-build /app/apps/api/docker-dist ./apps/api/docker-dist
COPY apps/api/schema.sql ./apps/api/docker-dist/schema.sql
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["sh", "-c", "node docker-dist/scripts/schema.js && node docker-dist/scripts/seed.js && exec node docker-dist/src/server.js"]

FROM nginx:stable-alpine AS frontend
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
