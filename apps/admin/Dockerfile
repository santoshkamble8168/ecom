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
COPY --from=build /workspace/apps/admin/.next ./apps/admin/.next
COPY --from=build /workspace/apps/admin/public ./apps/admin/public
COPY --from=build /workspace/apps/admin/package.json ./apps/admin/package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/admin/node_modules ./apps/admin/node_modules
EXPOSE 3001
CMD ["pnpm", "--filter", "@ecom/admin", "start"]
