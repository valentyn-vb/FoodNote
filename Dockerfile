# ---- Build stage ----
FROM node:26-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# shared is copied in full (not just package.json): its `prepare` script
# builds dist/ during `npm ci`, which needs the sources present
COPY shared/ shared/
COPY backend/package.json backend/
RUN npm ci -w shared -w backend

# Built in dependency order: shared first, then backend
COPY backend/ backend/
RUN npm run build -w shared && npm run build -w backend

RUN npm prune --omit=dev

# ---- Production stage ----
FROM node:26-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist

USER node
EXPOSE 3001
# Apply any pending migrations, then start the API. Migrations run against the
# compiled data source via the plain typeorm CLI (a runtime dep) — ts-node and
# src/ are not present in this stage. migrationsRun is off in production, so
# this is the single place prod schema changes are applied.
CMD ["sh", "-c", "npm run migration:run:prod -w backend && exec node backend/dist/main.js"]
