FROM node:22-alpine AS base

# OpenSSL is required by the Prisma query engine on Alpine
RUN apk add --no-cache libc6-compat openssl

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Prisma only parses DATABASE_URL at generate time — it never connects. The
# real connection string is injected at runtime from Secret Manager.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate

# The schema is NOT pushed here. Migrations are applied deliberately against
# Cloud SQL (see README), never as a side effect of building an image.
RUN npm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Leverage standalone output traces for Cloud Run
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
