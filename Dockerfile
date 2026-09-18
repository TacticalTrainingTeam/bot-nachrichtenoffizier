FROM node:lts-alpine

RUN npm install -g pnpm && mkdir -p /app/data && chown -R node:node /app

WORKDIR /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --chown=node:node . .

VOLUME ["/app/data"]

CMD ["node", "--experimental-sqlite", "index.js"]
