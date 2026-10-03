FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @ecom/api...

FROM deps AS build
RUN pnpm --filter @ecom/api prisma:generate
RUN pnpm --filter @ecom/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /workspace
COPY --chown=node:node --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=build /workspace/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
USER node
CMD ["node", "apps/api/dist/main.js"]
