# Biber-Portal – Image für CapRover (Deploy per GitHub-Webhook oder ./build.sh deploy)
#
# Stufe 1 führt die Tests aus. Schlagen sie fehl, bricht der Build ab und CapRover
# lässt die bisher laufende Version unverändert online.

# ---------- Stufe 1: Tests ----------
FROM node:22-alpine AS test
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && touch /tmp/tests-ok

# ---------- Stufe 2: Laufzeit ----------
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=80 \
    DATA_DIR=/app/data

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Abhängigkeit zur Teststufe: ohne grüne Tests kein Image
COPY --from=test /tmp/tests-ok /tmp/tests-ok

COPY server.js ./
COPY lib ./lib
COPY public ./public

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1
CMD ["node", "server.js"]
