# Buy VOID verified-payment V2 primitive authority boundary

## Purpose

This Draft repairs the JSON primitive-coercion defect independently reproduced
by negative witness PR #2695. The integration-lineage verifier previously used
`String(...)` on several authority-bearing unknown values. In JavaScript a
one-element array stringifies to the contained scalar, so malformed JSON values
could pass the same address/hash/topic/chain/amount checks as reviewed
primitives.

The repair is based on integration PR #2675 and preserves its native-USDC and
original payment-instruction consistency checks.

## Exact source lineage

Predecessor integration V2 source Git blob:

`c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`

Repaired V2 source Git blob:

`0df94fb35681f358318416fe6c48f3b794cd6074`

The source change is deliberately local to
`src/economic/buy_void_verified_payment_v2.ts`.

## Repaired boundary

Authority-bearing identifiers now require primitive strings before
normalization:

- source chain;
- addresses and token contracts;
- transaction hashes and event topics;
- request ID; and
- topic-encoded sender/receiver addresses.

Integer-like fields preserve the already reviewed primitive
`string | number | bigint` forms but reject arrays and objects. Requested USDC
amount preserves primitive string/finite-number behavior and rejects structural
coercion.

The verifier also:

- requires `policy.allowed_chains` to actually be an array;
- ignores malformed non-object log entries;
- rejects a defined non-boolean `removed` field for a candidate log; and
- only falls back to the receipt transaction hash when a log transaction hash
  is truly absent (`null`/`undefined`), not when a malformed falsy value was
  supplied.

## Regression proof

`scripts/prove_buy_void_verified_payment_v2_primitive_boundary_v1.ts`
constructs one valid synthetic Base native-USDC payment with the integration
checkout-instruction fields present.

It requires the primitive control to verify, then requires **29** malformed
structural-type cases to HOLD. These include the 21 array-wrapped boundaries
from #2695 plus request-ID numeric coercion, non-array allowlist shape,
checkout token/address arrays, malformed `removed`, and a falsy numeric log
transaction hash that previously fell through to receipt identity.

A second control preserves reviewed primitive flexibility: numeric receipt
status/block/log values and numeric USDC amount still produce the same canonical
verified event, while omitted optional log transaction/block identities still
bind to the receipt as before.

The focused workflow runs on Node 22/24/26 and requires byte-identical receipts.

## Remaining authority boundary

This source repair closes one verifier parsing defect only. Because
`buy_void_verified_payment_v2.ts` is part of the source-finality and compiled
payment closure, its new blob requires fresh downstream provenance/compiled
successor evidence before any production promotion.

This Draft does not call RPC, read customer records, write allocation/custody
state, mount a route, access wallet/key/signer material, construct/sign/broadcast
a transaction, mutate Chain-2050/WC, activate presale/market, or move funds.

Keep Draft until exact-head semantic proof and downstream source-finality
successor work are green.

**PROTECT THE CORE.**
