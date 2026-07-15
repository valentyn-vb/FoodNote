# ---- Build stage ----
FROM node:26-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm ci -w shared -w backend

# Sources, built in dependency order: shared first, then backend
COPY shared/ shared/
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
CMD ["node", "backend/dist/main.js"]
