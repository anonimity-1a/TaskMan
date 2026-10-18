FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package.json package-lock.json ./

# Leave NODE_ENV unset. npm ci skips devDependencies when it is
# "production", and the vite binary is required for the build below.
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV TASKMAN_DATA=/data/taskman.json
ENV TASKMAN_LEGACY=/data/document.json

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY src ./src

EXPOSE 5173

CMD ["node", "server/index.mjs"]
