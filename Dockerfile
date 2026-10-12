FROM node:24.0.2-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
