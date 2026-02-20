# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config first (better Docker layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/core/package.json packages/core/
COPY packages/react/package.json packages/react/
COPY apps/demo/package.json apps/demo/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core/ packages/core/
COPY packages/react/ packages/react/
COPY apps/demo/ apps/demo/
COPY tsconfig.base.json ./

# Build: core → react → demo (turbo handles order)
RUN pnpm run build

# ── Stage 2: Serve with nginx ──────────────────────────────
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY deploy/nginx.conf /etc/nginx/conf.d/worldengine.conf

# Copy built demo app and fix permissions
COPY --from=builder /app/apps/demo/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
