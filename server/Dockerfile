# QuantumBank — Unified container: React frontend + Node.js API gateway
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build Node.js server
FROM node:18-alpine AS server-build
WORKDIR /usr/src/app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .

# Copy React build output into server's public/ directory
# Express serves these as static files, SPA fallback handles all routes
COPY --from=frontend-build /app/dist ./public

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "index.js"]
