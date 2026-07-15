# ---- Build stage: install deps and build the Nest backend (standalone) ----
FROM node:26-alpine AS builder
WORKDIR /app

# Install backend deps first for layer caching (invalidated only on manifest change).
COPY backend/package.json ./
RUN npm install

# Copy backend sources and build (outputs to /app/dist, entry dist/main.js).
COPY backend/ ./
RUN npm run build

# Drop devDependencies for the runtime image (native bcrypt stays compiled for node:26-alpine).
RUN npm prune --omit=dev

# ---- Production stage: runtime only ----
FROM node:26-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Backend listens on process.env.PORT (Render injects it); 3001 is the local default.
EXPOSE 3001
CMD ["node", "dist/main.js"]
