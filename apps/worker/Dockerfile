FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm install --frozen-lockfile --filter @ecom/worker...

FROM deps AS build
RUN pnpm --filter @ecom/worker build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /workspace
COPY --chown=node:node --from=build /workspace/apps/worker/dist ./apps/worker/dist
COPY --chown=node:node --from=build /workspace/apps/worker/package.json ./apps/worker/package.json
COPY --chown=node:node --from=build /workspace/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/worker/node_modules ./apps/worker/node_modules
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "try{process.kill(1,0)}catch{process.exit(1)}"
USER node
CMD ["node", "apps/worker/dist/main.js"]
