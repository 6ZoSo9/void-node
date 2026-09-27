# 2026-09-27 — Epoch-2 Public Submission Gateway Core V1

Marker: `VOID_REN_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1`

## Context

Canonical main at branch creation:

`eff8466f421e57f31b022d6b14d088eb60945347`

The epoch-2 signed-intent primitive already bound Chain 2050, execution epoch 2,
gateway identity, signer nonce, expiry, target, gas and calldata hash, but it
stopped before the required atomic replay-consumption seam.

## Source composition

The new gateway core verifies the canonical signed intent and then requires an
external atomic `consumeIfFresh` for the exact typed-data digest before it can
return source admission.

A race proof uses a stale ordinary replay view and two concurrent admissions;
exactly one may consume/admit.

Post-review hardening additionally:

- rejects over-limit calldata text before regex scanning;
- requires a bounded replay-store consume deadline without exposing an
  externally-triggerable AbortSignal callback surface;
- snapshots the signed intent once from exact enumerable data descriptors and
  rejects accessors/trapping proxies before signature verification;
- normalizes trapping trusted-clock, replay-store, and replay-result structures
  to gateway HOLD reasons without inspecting thrown objects;
- includes replay-result structural normalization in the monotonic deadline;
- gives the post-inspection deadline precedence over invalid/replay result
  classification;
- independently measures monotonic elapsed time around replay consumption so a
  synchronously blocking adapter cannot evade the deadline timer;
- caps that deadline by the signed intent's remaining lifetime;
- requires the trusted clock to be synchronous and monotonic across admission;
- safely quenches rejected clock thenables before returning a gateway HOLD;
- removes external replay-store prechecks entirely so only atomic
  `consumeIfFresh` has replay authority;
- accepts only the exact fresh/replay atomic consume tuples and classifies
  every contradictory tuple as adapter corruption;
- rechecks trusted time after atomic replay consumption; and
- fails closed if the signed intent expires while consumption is in flight.

The source also bounds the target allowlist, calldata bytes, and signed-intent
decimal length before `BigInt` conversion.

## Gate movement

The checked-in signed-submission policy now records:

- `signed_submission_source_primitive_proven=true`; and
- `execution_epoch_bound_in_public_gateway=true`.

The successor migration candidate mirrors only the execution-epoch gateway
binding.

Still false:

- durable replay-store verification;
- runtime route activation;
- transaction submission/broadcast;
- privileged signer nonce/key replay fence;
- pending legacy signed-transaction census;
- cross-epoch raw-transaction replay protection;
- migration authorization; and
- public activation.

## Authority boundary

No service mutation, RPC call, wallet/signer/private-key access, transaction
construction/signing/submission/broadcast, Chain-2050 write, token movement,
funds movement, migration, or public activation occurred.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
