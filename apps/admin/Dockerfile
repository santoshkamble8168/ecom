FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --frozen-lockfile --filter @ecom/admin...

FROM deps AS build
RUN pnpm --filter @ecom/admin build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /workspace
COPY --chown=node:node --from=build /workspace/apps/admin/.next ./apps/admin/.next
COPY --chown=node:node --from=build /workspace/apps/admin/public ./apps/admin/public
COPY --chown=node:node --from=build /workspace/apps/admin/package.json ./apps/admin/package.json
COPY --chown=node:node --from=build /workspace/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/admin/node_modules ./apps/admin/node_modules
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
USER node
CMD ["pnpm", "--filter", "@ecom/admin", "start"]
