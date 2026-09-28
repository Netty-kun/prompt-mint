# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock* ./

RUN corepack enable && yarn install --immutable

COPY . .

RUN yarn build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=development

RUN npm install -g vite

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 5173

CMD ["vite", "preview", "--host", "0.0.0.0"]
