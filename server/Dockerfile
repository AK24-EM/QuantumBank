# QuantumBank — Unified container: React frontend + Node.js API gateway
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build Node.js server
FROM node:20-alpine AS server-build
WORKDIR /usr/src/app
# Patch all Alpine system packages to latest to clear known CVEs
RUN apk update && apk upgrade --no-cache
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .

# Copy React build output into server's public/ directory
COPY --from=frontend-build /app/dist ./public

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "index.js"]
