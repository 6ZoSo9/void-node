# Buy VOID payment-keyed dispatcher v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1`

Status: **source-only qualified concurrency contract**. This change does not mount a runtime route, add a production database adapter, access a wallet, sign, broadcast, or move funds.

## Purpose

The payment-keyed preparation lane already produces a durable `attempt_id` before any guarded external submission. This contract defines the next coordination boundary: multiple workers may contend to advance one prepared attempt, but only one authoritative lease generation may act and only one canonical result may be published.

The contract uses:

- `attempt_id` as the canonical dispatcher job key;
- an immutable `request_fingerprint_sha256` as the canonical payload identity;
- a monotonic `lease_gen` strictly as a stale-worker fence;
- a separate 128-bit random `lease_token` plus `worker_id` as lease authority;
- database time read inside the transaction for lease validity;
- one terminal canonical `result_fingerprint_sha256`;
- mandatory audit decisions in the same transaction as state mutation or rejection; and
- gap-free per-job `decision_seq` as the canonical external audit order.

The lease token is never included in the public job projection.

## Qualified source

This repository contract is bound to the completed external reference proof:

| Evidence | SHA-256 / result |
|---|---|
| generation-2 design | `816ce079d3f8b36c374ec4a24698f01af1b291e7a8e9c2d9aca79bdbad10989f` |
| substantive independent audit receipt | `23e38a4dcf01cb1fe4286850b06354e8db66a457dc12b1b12b3451afaa064f00` |
| SQLite executable reference | `c19c10bebf575932a5e28ee84a3b55fc585a18dd2b6c6ddbc152e48ab127a8b6` |
| qualified PostgreSQL reference v3 | `0ebc2ae33838080dc08fe238d950d8b1558d306b2165a42502630d0e887c710b` |
| combined V3 qualification launcher | `c3fed8e1edd366b5a0de8bb4d21dcda32d99fe4bd6031ae6908adefe52ee00f7` |
| PostgreSQL baseline | 9/9 GREEN |
| canonical audit order | 5/5 GREEN |
| PostgreSQL server SIGKILL recovery | 4/4 GREEN |
| randomized model-check | 24/24 seeds, 2,880 steps GREEN |
| independent differential oracle | 20/20 seeds, 2,800 steps, 2,862 comparisons GREEN |
| concurrent linearizability | 70/70 rounds GREEN |

Those proofs qualified the semantics. They do **not** authorize this repository to silently introduce PostgreSQL or to mount a production dispatcher.

## Store adapter contract

`BuyVoidPaymentKeyedDispatcherStoreV1` deliberately exposes only a transactional adapter. A production implementation is admissible only when its authority declares all of the following exactly:

```text
transaction_isolation=SERIALIZABLE
per_job_admission=session_advisory_lock_before_serializable_snapshot
canonical_audit_order=per_job_decision_seq
retry_sqlstates=40001,40P01
```

The qualified PostgreSQL reference acquired the per-job session advisory lock before opening the SERIALIZABLE snapshot. This prevents the hot audit-order cursor from causing repeated stale-snapshot serialization failures while retaining SERIALIZABLE validation inside the actual job transaction.

A future production adapter must preserve that ordering property or supply a separately qualified equivalent. `BIGSERIAL`/sequence allocation alone is explicitly **not** a commit-order clock.

## State machine

```text
(no row)
   |
   | submit(attempt_id, request_fingerprint)
   v
READY
   |
   | claim(worker, ttl)
   v
LEASED(gen=N, owner, capability, expires)
   |                 |
   | renew           | lease expires; later claimant observes expiry
   |                 v
   |               READY-like reclaimable state
   |                 |
   |                 | claim -> gen=N+1
   |                 v
   |               LEASED(gen=N+1)
   |
   | publish(result_fingerprint)
   v
PUBLISHED  (terminal)
```

The stored row is never deleted. Expiry is derived from database time; a later reclaim records `LEASE_EXPIRED_RECLAIM` and increments the generation.

## Invariants

1. Exactly one canonical job row exists per `attempt_id`.
2. `request_fingerprint_sha256` never changes after first submit.
3. Same attempt + same fingerprint replays idempotently in every state.
4. Same attempt + different fingerprint is rejected before canonical mutation, including after publication.
5. Worker claim never accepts or changes the immutable request fingerprint.
6. `lease_gen` only increases and is not an authentication secret.
7. Only the matching `lease_token` + `worker_id` + current generation may renew or publish.
8. An expired/stale generation can never overwrite a newer generation.
9. Exactly one canonical result fingerprint is published; later publication attempts return that canonical result idempotently.
10. State mutation and its success audit decision commit atomically.
11. Replays/rejections that must be audited commit their audit decision before return.
12. Per-job `decision_seq` is contiguous for committed decisions and allocated transactionally.
13. Public job projections never expose `lease_token`.

## Audit events

The contract makes the following durable decision vocabulary explicit:

```text
SUBMIT
SUBMIT_REPLAY
PAYLOAD_CONFLICT
CLAIM
CLAIM_REJECT_NOT_FOUND
CLAIM_REJECT_PUBLISHED
CLAIM_REJECT_ACTIVE
LEASE_EXPIRED_RECLAIM
LEASE_RENEW
RENEW_REJECT_NOT_FOUND
RENEW_REJECT_PUBLISHED
RENEW_REJECT_STALE
RENEW_REJECT_UNAUTHORIZED
RENEW_REJECT_EXPIRED
PUBLISH
PUBLISH_REPLAY
PUBLISH_REJECT_NOT_FOUND
PUBLISH_REJECT_STALE
PUBLISH_REJECT_UNAUTHORIZED
PUBLISH_REJECT_EXPIRED
```

One operation may append more than one decision. Reclaim, for example, records the observed expiry and then the successful new claim in the same transaction.

## Repository authority

This PR intentionally remains below every live-money boundary:

```text
source_only_contract=true
runtime_route_mount=false
canonical_parent_dispatch=false
production_store_adapter_present=false
transaction_broadcast=false
wallet_access=false
signing=false
money_movement=false
```

The existing payment-keyed preparation coordinator is not modified or mounted to this dispatcher in v1. A later integration must explicitly identify the durable prepared-attempt fingerprint, provide the qualified production store adapter, and prove the handoff into guarded broadcast without weakening existing custody, nonce, saga, reconciliation, or receipt gates.

## Acceptance proof

`scripts/prove_buy_void_payment_keyed_dispatcher_v1.ts` uses a transactionally cloned in-memory store to prove the source contract itself. The fake store is not the production adapter; it exists to make state/audit atomicity and rollback observable in CI.

The proof requires:

- exact qualified-reference hash binding;
- first submit and same-fingerprint replay;
- different-fingerprint rejection before and after publication;
- active-lease exclusion;
- worker/capability authorization;
- expiry/reclaim generation increment;
- stale-generation publication rejection;
- exactly one canonical result and publication replay;
- gap-free `decision_seq`;
- rollback of a job mutation when its audit append fails; and
- fail-closed rejection of a store that does not advertise the qualified SERIALIZABLE/advisory-lock contract.

CI runs the proof plus root TypeScript typecheck on Node 22, 24, and 26.
