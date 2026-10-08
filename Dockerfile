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
COPY --from=build /app/src/economic/buy_void_coupled_launch_gate_v1.mjs ./src/economic/
COPY --from=build /app/ops/precision/void-buy-coupled-live-generation-publish-v1.mjs ./ops/precision/
COPY --from=build \
  /app/tools/void-wc-void-coupled-launch-readiness-v1.mjs \
  /app/tools/void-wc-void-production-readiness-v1.mjs \
  /app/tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs \
  /app/tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs \
  /app/tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs \
  /app/tools/void-wc-void-market-vault-compiler-identity-v1.mjs \
  /app/tools/void-wc-void-opening-settlement-adapter-review-v1.mjs \
  /app/tools/void-coupled-economic-successor-gate-v1.mjs \
  /app/tools/void-economic-evm-successor-migration-v1.mjs \
  /app/tools/void-wc-void-coupled-opening-v1.mjs \
  /app/tools/void-shared-market-post-discovery-state-v2.mjs \
  /app/tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs \
  /app/tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs \
  /app/tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs \
  /app/tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs \
  /app/tools/void-wc-void-reverse-settlement-v1.mjs \
  /app/tools/void-wc-void-public-quote-disclosure-v1.mjs \
  /app/tools/void-economic-intent-ttl-caps-policy-v1.mjs \
  /app/tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs \
  ./tools/
COPY --from=build /app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs ./tools/
COPY --from=build \
  /app/ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json \
  /app/ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json \
  /app/ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json \
  /app/ops/mainnet0/wc-void-market-vault-compiler-identity-v1-artifact.zip.b64 \
  /app/ops/mainnet0/wc-void-production-candidate-v1.json \
  /app/ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json \
  /app/ops/mainnet0/economic-evm-successor-migration-candidate-v1.json \
  ./ops/mainnet0/
USER root
ENV NODE_ENV=production
EXPOSE 4100
CMD ["node","dist/index.js"]
