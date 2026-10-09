# Buy VOID auto-fulfillment primitive coercion — negative witness V1

## Negative security result

This Draft tests the current auto-fulfillment decision boundary without changing
production source. A GREEN run means the defect was reproduced; it is **not**
launch-readiness evidence.

Reviewed source:
`src/economic/buy_void_auto_fulfillment_v1.ts`

Pinned Git blob:
`1ac1ad6213be83f1aa8261a554caa91544fe5e09`.

The decision currently normalizes several authority-bearing unknown values
through JavaScript `String(...)` or `Number(...)`. A one-element array can
therefore become the same scalar text/number as a reviewed primitive.

## Reproduction

The proof starts with one valid synthetic verified Base/USDC payment and
requires an approved unsigned fulfillment decision.

It then wraps **28** individual request, verified-event, payment-verifier, and
fulfillment-policy values in arrays. Every malformed input is required to
produce the exact same approved decision bytes as the primitive control.

The covered boundaries include request/payment IDs, source chain, transaction
hashes, delivery/receive addresses, USDC/VOID amounts, operator status, log and
block identities, confirmation count, USDC contract, policy chain allowlist,
minimum confirmations, rate numerator/denominator, and remaining inventory.

The proof separately shows the exported canonical payment identity accepts
array-wrapped chain/hash/log-index values, and that three malformed prior-claim
identity fields can still be accepted as a duplicate claim.

## Why the pure function must close this boundary

The decision function is called from more than the auto-claim worker. It is
also consumed by the fulfillment journal and pipeline coordinator. A caller-side
snapshot in one worker therefore cannot be the sole primitive-type authority
wall.

A successor should reject wrong structural types before normalization while
preserving explicitly reviewed primitive string/number/bigint forms. Durable
prior claims should likewise require exact primitive identity fields before
they can suppress a new claim as a duplicate.

## Authority boundary

This Draft adds proof/workflow/documentation only. It performs no RPC, customer
record access, filesystem mutation, service deployment, wallet/key/signer
access, transaction construction/signing/broadcast, Chain-2050/WC mutation,
presale/market activation, inventory/treasury/liquidity mutation, or funds
movement.

Always retain:
`production_payment_authority_ready=false`,
`source_modified=false`, and `funds_moved=false`.

Keep Draft/unmerged. **PROTECT THE CORE.**
