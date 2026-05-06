# Buy VOID Base Claim Rehearsal — Current Operator Note

Status: rehearsal_created_no_claim_no_void_send
Commit: c7606032
Checkpoint tag: ckpt-buy-void-base-claim-create-rehearsal-green-20260506-021206

## Rehearsal artifact

OUT_JSON=/tmp/buy-void-base-claim-create-rehearsal-20260506-020909.json

## IDs

REQUEST_ID=buyreq_1778051350148_af9d3023
QUEUE_ID=buyq_1778051350285_11b64d45
WATCH_ID=buywatch_1778051350400_6dcb454d

## Payment target

Chain: Base
Asset: Base native USDC
Amount: 25 USDC
Receiver: 0x45dd104e3F7CC2A080F2edA094D011D09c51960B
Delivery wallet: 0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31

## Current expected state

Request status: draft_ready
Queue status: queued
Watch status: watch_target_created
payment_ref: empty
void_tx_ref: empty

## Hard operator rules

Do not run MODE=claim until a real Base native USDC transaction hash exists and we are intentionally testing claim verification only.

Do not treat claim verification as VOID fulfillment.

Do not send VOID from this lane.

No VOID send should occur until a separate fulfillment proof exists and passes.

Blind direct deposits are not supported.

Exchange or custodial wallet sends are not supported.

The user must start from the Buy VOID participant flow so the request, queue item, payment tag, watch target, delivery wallet, amount, and receiver can be matched.

## Safe commands

Read-only backend readiness:

    make buy-void-backend-readiness-proof

Fail-closed claim test:

    make buy-void-claim-tx-failclosed-proof

Only after a real Base USDC tx exists:

    MODE=claim OUT_JSON=/tmp/buy-void-base-claim-create-rehearsal-20260506-020909.json TX_HASH=0x...real_hash... bash ops/mainnet/buy-void-base-claim-tx-real-proof.sh

That command verifies the payment claim only. It must not be treated as permission to send VOID.
