# Multi-stage build for SpacesOS
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S spacesos -u 1001

COPY --from=builder --chown=spacesos:nodejs /app/node_modules ./node_modules
COPY --chown=spacesos:nodejs . .

USER spacesos

EXPOSE 3000
ENV NODE_ENV production

CMD ["npm", "start"]
