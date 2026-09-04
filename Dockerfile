# Build from this directory:
#   docker build -t request-management/frontend .

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# `output: "standalone"` in next.config.ts is what makes the runner stage small.
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# The traced server and the assets it serves. `server.js` sits at the root of
# the standalone bundle and brings its own pruned node_modules.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# USER_SERVICE_URL and CORE_SERVICE_URL are read at runtime in src/lib/backend.ts,
# so they are passed to `docker run` rather than baked in here.
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
