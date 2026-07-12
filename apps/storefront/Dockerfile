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
COPY --from=build /workspace/apps/storefront/.next ./apps/storefront/.next
COPY --from=build /workspace/apps/storefront/public ./apps/storefront/public
COPY --from=build /workspace/apps/storefront/package.json ./apps/storefront/package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/storefront/node_modules ./apps/storefront/node_modules
EXPOSE 3000
CMD ["pnpm", "--filter", "@ecom/storefront", "start"]
