FROM node:24-alpine
WORKDIR /app
COPY ops/railway/void-p2p-introducer-v1/index.mjs /app/index.mjs
USER node
CMD ["node", "/app/index.mjs"]
