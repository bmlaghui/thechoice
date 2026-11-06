FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @the-choice/web build
FROM node:24-alpine
USER node
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/dist/web ./dist
EXPOSE 4000
CMD ["node","dist/server/server.mjs"]
