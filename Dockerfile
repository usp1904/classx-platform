# ClassX Platform - Enterprise Docker build

FROM node:26-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=256
COPY package.json package-lock.json ./
RUN npm ci
ENV VITE_API_BASE_URL=/api
COPY . .
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||8787)+'/api/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "server/index.js"]

