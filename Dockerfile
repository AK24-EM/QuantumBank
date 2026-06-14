# Multi-stage Dockerfile for QuantumBank Client (React/Vite)
FROM node:18-alpine AS build

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the static assets
RUN npm run build

# Production server stage (using Nginx to serve static files)
FROM nginx:alpine

# Custom nginx config — SPA routing + /health endpoint + security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
