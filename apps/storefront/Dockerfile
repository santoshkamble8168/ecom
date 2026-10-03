FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/storefront ./apps/storefront
RUN pnpm install --frozen-lockfile --filter @ecom/storefront...

FROM deps AS build
RUN pnpm --filter @ecom/storefront build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /workspace
COPY --chown=node:node --from=build /workspace/apps/storefront/.next ./apps/storefront/.next
COPY --chown=node:node --from=build /workspace/apps/storefront/public ./apps/storefront/public
COPY --chown=node:node --from=build /workspace/apps/storefront/package.json ./apps/storefront/package.json
COPY --chown=node:node --from=build /workspace/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/storefront/node_modules ./apps/storefront/node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
USER node
CMD ["pnpm", "--filter", "@ecom/storefront", "start"]
