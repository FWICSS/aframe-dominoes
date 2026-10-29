# Image de production : dépendances d'exécution seules, utilisateur non privilégié.
FROM node:26.13.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:26.13.0-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/config.json" || exit 1
CMD ["node", "server/index.js"]
