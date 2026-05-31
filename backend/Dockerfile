FROM node:20-alpine AS builder
WORKDIR /app
COPY package-lock.json ./
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
COPY shared/ ./shared/
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
RUN mkdir -p uploads/logos uploads/pdfs
EXPOSE 4000
CMD ["node", "dist/index.js"]
