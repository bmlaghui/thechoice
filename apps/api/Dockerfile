FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @the-choice/api prisma:generate && pnpm --filter @the-choice/api build
FROM node:24-alpine
WORKDIR /app
ENV NODE_PATH=/app/apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
# Le client généré se trouve dans /app/dist et les imports ESM n'utilisent pas
# NODE_PATH. Copier le paquet réel à la racine garantit sa résolution au runtime.
COPY --from=build --chown=node:node /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build --chown=node:node /app/node_modules/.pnpm/@prisma+client-runtime-utils@*/node_modules/@prisma/client-runtime-utils ./node_modules/@prisma/client-runtime-utils
COPY --from=build --chown=node:node /app/apps/api/prisma ./prisma
COPY --from=build --chown=node:node /app/apps/api/prisma.config.ts ./prisma.config.ts
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node","dist/src/main.js"]
