# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || yarn || pnpm i
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build \
  /app/src/economic/buy_void_source_finality_authenticated_composition_v3.ts \
  /app/src/economic/buy_void_source_finality_authority_v2.ts \
  /app/src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts \
  /app/src/economic/buy_void_payment_rpc_observer_v1.ts \
  /app/src/economic/buy_void_verified_payment_v2.ts \
  ./src/economic/
ENV NODE_ENV=production
EXPOSE 4100
CMD ["node","dist/index.js"]
