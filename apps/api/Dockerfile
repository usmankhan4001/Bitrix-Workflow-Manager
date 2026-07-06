FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
# Use the PostgreSQL production schema for the Docker build
COPY prisma ./prisma
RUN cp prisma/schema.prod.prisma prisma/schema.prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
RUN cp prisma/schema.prod.prisma prisma/schema.prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
