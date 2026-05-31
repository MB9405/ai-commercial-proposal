FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY bot/package.json ./bot/
COPY shared/package.json ./shared/
RUN npm ci
COPY bot/tsconfig.json ./bot/tsconfig.json
COPY bot/src ./bot/src
RUN npm run build -w bot

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/bot/dist ./bot/dist
COPY --from=builder /app/bot/package.json ./bot/package.json
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "bot/dist/index.js"]
