FROM oven/bun:1.4.2 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4.2
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

USER bun

# Internal points API (POST /internal/staff/points) — 0.0.0.0:8788 by default.
EXPOSE 8788

# remote-config as a preload: it awaits the admin console settings before any module reads process.env.
# (A plain `import "./remote-config.ts"` is not enough: sibling imports run while its top-level await waits.)
CMD ["bun", "--preload", "./src/remote-config.ts", "src/index.ts"]
