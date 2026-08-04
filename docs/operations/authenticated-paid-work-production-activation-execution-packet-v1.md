# Authenticated paid-work production activation execution packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1`

## Purpose

This packet is the canonical non-secret source handoff for a later, separately
authorized paid-work activation lane. It fixes source ordering and fail-closed
requirements without authorizing execution.

## Current source binding

Reviewed repository baseline:

`71767df629c1f0034c38ea441c6e2cefc7794820`

Merged credential-metadata source:

`cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa`

The credential-metadata binding now points to the squash-merge commit for PR
#961 rather than the earlier PR #955 metadata commit. The other eleven semantic
source bindings remain unchanged.

A future operator lane must still capture and revalidate the then-current
`origin/main`. This source record does not pre-authorize a later commit.

## Nine-record post-restart truth

The packet mirrors the merged credential metadata exactly:

- selected credential: `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`
- registry ID: `voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f`
- registry SHA-256: `92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e`
- credential count: `9`
- receiver classification: `RECEIVER_ACTIVE_TARGET_REGISTRY`
- receiver loaded target registry: true
- receiver restart required: false
- receiver configuration revalidation required: true
- live authentication observed: false
- current runtime freshness proven by source: false
- sanitized restart receipt SHA-256: `d488a4f35a32b1ba8c8a0a955ce28b095af585391ae34e87c41a7f6837e48a49`

The source records that the reviewed restart loaded the nine-record registry. It
does not establish permanent runtime freshness and does not observe a live
authenticated paid-work submission.

## Current decision

`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`

All eighteen execution gates remain ordered and mandatory. Trusted context,
credential freshness and revocation, provider and requester signatures, the
final direct-authentication packet, replay state, a fresh quote, execution-plan
digest, current runtime preimage, live-canary scope, and fresh ZoSo confirmation
remain unresolved execution-time inputs.

## Fail-closed boundary

Execution stops when current main or a source artifact drifts, the runtime
preimage or replay state is unexpected, credential or trusted-context evidence
fails revalidation, signatures or the final authentication packet mismatch, the
quote is stale or consumed, confirmation is absent or mismatched, or any
unreviewed mutation would be required.

The receiver does not need another restart merely to load the nine-record
registry. That does not authorize activation or eliminate fresh configuration
and runtime revalidation.

## Authority boundary

This packet grants no authority for credential access, deployment, service
start or restart, production signing, quote acceptance, payment, work dispatch,
Work Credit writes, wallet or signer access, transaction construction or
broadcast, settlement, activation, or fund movement.

## Files

- `config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json`
- `docs/operations/authenticated-paid-work-production-activation-execution-packet-v1.md`
- `scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs`

## Verification

```bash
python3 -m json.tool config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json
node --check scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true
```
