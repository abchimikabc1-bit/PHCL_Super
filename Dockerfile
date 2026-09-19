FROM node:24-bookworm-slim AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

COPY . .

RUN ./node_modules/.bin/esbuild worker/media-validation-executable.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --conditions=react-server \
    --external:firebase-admin/* \
    --outfile=/workspace/build/media-validation-worker/index.mjs


FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ffprobe -version

COPY worker/runtime/package.json worker/runtime/package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

COPY --from=builder \
    /workspace/build/media-validation-worker/index.mjs \
    /app/index.mjs

USER node

EXPOSE 8080

CMD ["node", "/app/index.mjs"]