# Dockerfile for QuantumBank Server (Node.js/Express)
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package and package-lock files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy server code
COPY . .

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD [ "node", "index.js" ]
