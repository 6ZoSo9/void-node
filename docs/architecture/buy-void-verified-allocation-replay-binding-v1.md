# Buy VOID verified-payment / allocation replay binding v1

Marker: `VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1_SOURCE_GREEN`

## Purpose

The canonical Buy VOID payment admission code durably appends `payment_verified`
while holding the existing capacity/duplicate lock. On an exact replay of that
verified request, its current idempotent branch returns without invoking the
new-payment operation. A crash after payment fsync but before canonical
`allocation_reserved` publication can therefore leave a paid capacity
obligation without a durable allocation row. An operator-event sidecar is **not**
an allocation record.

`src/economic/buy_void_verified_allocation_replay_binding_v1.ts` is the first,
**pure source-only** byte-history binding contract for that crash case. It is
not the runtime writer and it grants **no** payment acceptance or economic
mutation authority. Its input consists only of a request ID and three bounded
Buffers: `requests.jsonl`, `operator-events.jsonl`, and the canonical #2433
allocation reservation JSONL. It accepts **no caller-provided green booleans**,
paths, generation selectors, receipt URLs, or mutation callbacks.

## Exact snapshots and fail-closed behavior

The pure classifier requires canonical UTF-8 JSONL with complete LF-terminated,
`JSON.stringify`-round-trippable rows, no duplicate JSON members or truncated
final row, and bounded size/row count. It binds all observed request history
against exact chain, transaction, quote, USDC contract, destination and
canonical coupled launch-authority lineage, rejecting missing or malformed
launch tuples **even if the allocation ledger is empty**. Later full request
snapshots may only add missing bindings, not erase or change prior fields;
byte-identical duplicate request snapshots HOLD. For every accepted verified-payment V2
row it binds the exact canonical payment identity using the existing
`canonicalBuyVoidPaymentIdentityV1` primitive, enforces one immutable event per
request/payment identity, exact request quote and configured 2:1 canonical
presale economics, canonical request-bound USDC token contract, transfer
amount, source transaction, explicit nondefaulted source chain, log index and
delivery addresses. A legacy request
without a recorded USDC contract remains source-HOLD; a later reviewed trusted
request/policy migration would be required rather than guessing from an event. Aggregate verified obligations must not exceed 10,000,000 VOID.

**Exact committed event hash** is SHA-256 of the existing serialized
`payment_verified` operator-event JSONL row **including its terminating LF**.
No timestamp, hash-shaped reference or summary supplied outside those bytes
can replace the event identity. A later trusted integration must verify that
the same exact byte definition is used by the #2433 allocation planner and
publisher before any production admission.

The classifier validates the entire canonical allocation JSONL with the merged
#2433 hash-chain classifier. Each existing allocation must match one verified
payment's identity, event-line hash, amount, delivery address, transaction and
request launch authority. It reports one of two *observations*:

- `verified_allocation_missing`: the verified-payment event is present but its
  canonical allocation record is absent. **`ok=false`**, with reason
  `verified_allocation_requires_protected_recovery`; this is a HOLD on
  fulfillment, not successful allocation, capacity recovery or permission to
  retry a write outside the admission lock.
- `allocation_present`: the canonical row matches the same event and launch
  tuple, without any new write. It is **still not** a production custody or
  rollback-resistance attestation.

Missing/duplicate/conflicting verified events, orphan or drifting allocation
rows, quote or payment identity drift, stale request launch lineage, malformed
history and over-capacity schedules return `held` without any data mutation.
Exact launch-authority **shape** is bound to supplied request bytes, but the
classifier cannot independently verify that the original generation receipt
was actually accepted, or that a later request update preceded a verified
payment; either claim requires separately trusted event/launch chronology.

## What this proves *and does not prove*

It proves a deterministic relationship **within supplied bytes** and can be
run again with the same byte snapshots to establish a stable source-only
classification. It **cannot** establish the origin, liveness, immutability,
append/fsync durability, retained descriptor identity, or independent high-water
rollback resistance of those buffers. An attacker can supply a forged,
self-consistent byte history. For that reason the exported authority contract
keeps `descriptor_bound_read`, `independently_proven_event_fsync`,
`source_finality_verification`, `protected_high_water_custody`,
`capacity_lock_held`, `request_launch_generation_authority`,
`runtime_integration`, `filesystem_read`, `filesystem_write`,
`payment_verified_append`, `allocation_write`, `production_gate_ready`,
wallet/signing, presale activation and funds movement **false**.

The test's four synthetic `*_gate_green` values are supplied exclusively to
an existing **pure planner** to construct a fixture for historical allocation
classification. Neither the new binding API nor any runtime route accepts or
trusts them.

## Required next production integration (separate gate)

1. While holding the already-reviewed verified-payment capacity/duplicate
   serialization lock, obtain *retained-descriptor, bounded and revalidated*
   `requests.jsonl` and accepted `operator-events.jsonl` snapshots. Bind the
   request authority and exact fsynced V2 event line without reconstructing
   a replacement event or trusting a caller assertion.
2. Protect the canonical allocation #2433 ledger under its existing #2442
   high-water and #2446/#2451 publication lock/state machine, and independently
   qualify designated-host custody under #2452. Never accept a second,
   divergent allocation history or a standalone per-record sidecar as truth.
3. On `verified_allocation_missing`, plan and durably publish exactly one
   `allocation_reserved` row only under the **same** verified-payment capacity
   lock/generation/request ordering. If the payment append already exists,
   append no second `payment_verified` and create no new finite-capacity
   obligation. An unresolved or unproven legacy intent remains HOLD.
4. After a crash following the allocation append but before public response,
   require canonical ledger/high-water postchecks to establish exact historical
   idempotence without republishing another allocation or minting a second
   obligation. Only after these independent proofs may fulfillment be considered.
5. Keep Buy VOID/WC/VOID coupled launch authority, host installation, source
   finality, signer, actual token delivery, public intake, and treasury/funds
   movement disabled until separately approved and proven.

## Synthetic proof / CI

After the repository build:

```bash
npm run typecheck
npm run build
node --check scripts/prove_buy_void_verified_allocation_replay_binding_v1.mjs
node scripts/prove_buy_void_verified_allocation_replay_binding_v1.mjs
```

The Node 22/24/26 focused workflow repeats these commands and requires clean
source-head/diff hygiene. The proof covers first missing allocation, exact
matching history, deterministic replay, changed event bytes, duplicate identity,
request/receipt/amount/quote drift, malformed or missing launch authority
at the empty-ledger crash gap, request-token vs event-token mismatch,
duplicate/regressed request snapshots, conflicting/orphan allocations,
noncanonical and truncated JSONL, near-sellout conservation and the absence
of runtime, funds and host authority.

**PROTECT THE CORE.**
