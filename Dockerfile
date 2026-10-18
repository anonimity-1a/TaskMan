FROM node:20-bookworm-slim

WORKDIR /app

ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV PORT=5173
ENV TASKMAN_DATA=/data/document.json

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 5173

CMD ["node", "server/index.mjs"]
