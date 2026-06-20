# Funding Public Proof Pack Abort Recovery Seal v1

Marker: `VOID_FUNDING_PUBLIC_PROOF_PACK_ABORT_RECOVERY_SEAL_DOC_V1`

## Purpose

This seal records that the first Funding Public Proof Pack v1 runtime patch attempt was aborted after TypeScript syntax errors.

The broken lane is not green.
The broken lane is not shipped.
The broken route is not public.
The valid baseline remains Funding Gateway Card v1.

## Valid baseline

- commit: `40a07171`
- valid lane: Funding Gateway Card v1
- local proof: `VOID_FUNDING_GATEWAY_CARD_V1_GREEN`
- live local runtime: `VOID_FUNDING_GATEWAY_CARD_V1_LIVE_LOCAL_GREEN`
- live public runtime: `VOID_FUNDING_GATEWAY_CARD_V1_LIVE_PUBLIC_GREEN`
- runtime exposure: `VOID_FUNDING_GATEWAY_CARD_V1_RUNTIME_EXPOSURE_CONFIRMED`

## Aborted lane

- attempted lane: Funding Public Proof Pack v1
- status: aborted
- reason: TypeScript syntax errors in runtime patch
- public route shipped: false
- committed: false
- cross-box green: false
- runtime green: false

## Recovery boundary

The recovery restored `src/index.ts`, removed the aborted proof-pack docs/proof files, preserved the broken diff under `/tmp/void-rescue-funding-proof-pack-v1`, and re-proved the Funding Gateway Card v1 baseline with TypeScript build green.

## Safety

- public_mutation=false
- money_movement_now=false
- wallet_send_now=false
- buy_void_fulfillment_now=false
- automatic_token_delivery=false
- investment_return_claim=false
- yield_claim=false

