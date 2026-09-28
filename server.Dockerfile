# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY server/package*.json ./server/

WORKDIR /app/server
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=development

COPY server/package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/server/build ./build

EXPOSE 3000

CMD ["node", "build/server.js"]
