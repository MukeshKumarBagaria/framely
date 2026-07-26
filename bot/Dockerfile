# Node 26 runs TypeScript directly (type stripping), so there is no build stage
# and nothing to keep in sync between `npm run dev` and production — the file
# that runs in the container is the file in the repo.
FROM node:26-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first so a code change doesn't invalidate the install layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY tsconfig.json ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY src ./src

# /data/customers is a bind mount shared with the renderer (§4.2). Create it so
# the container starts cleanly even when the volume is empty.
RUN mkdir -p /data/customers && chown -R node:node /data/customers /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.ts"]
