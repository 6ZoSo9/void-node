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
final row, and bounded size/row count. It validates request snapshot shape and immutable field transitions across the
shared history, then qualifies each payment obligation against its original
request. The initial request snapshot for any **target or verified/allocation
obligation** must bind a canonical USDC contract and closed coupled launch
tuple, rejecting missing original authority **even if the allocation ledger
is empty**. An unrelated *unverified* legacy request lacking those fields
may coexist without blocking a fully qualified newer request. Such a legacy
request remains permanently unqualified and cannot be upgraded by a later
self-reported request snapshot. Malformed populated authority still HOLDs. Later full request snapshots may only add
other missing bindings, not erase or change prior fields. Valid closed launch
member order alone is not lineage drift: the nine named primitive values are
compared independently of JSON object insertion order. Changing or erasing any
existing launch value HOLDs. **Any** earlier byte-identical snapshot repeated
after intervening updates (A→B→A) HOLDs, including an intervening key-order
permutation.
The explicit `source_chain` and every present `payment_chain` / `chain`
alias must agree. An inconsistent alias is permanent **per-request** negative
evidence: it HOLDs whenever that request is targeted or appears in verified
payment/allocation history, but an unrelated unverified legacy row with
conflicting aliases does not block an independent qualified request. A
missing/invalid explicit `source_chain` or structurally malformed history
still HOLDs the shared snapshot; this exception grants no historical origin
or independent storage-authentication authority. For every accepted verified-payment V2
row it binds the exact canonical payment identity using the existing
`canonicalBuyVoidPaymentIdentityV1` primitive, enforces one immutable event per
request/payment identity, exact request quote and configured 2:1 canonical
presale economics, canonical request-bound USDC token contract **and**
the fixed native-USDC allowlist: Base mainnet (8453)
`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`, Ethereum mainnet (1)
`0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`. Even a self-consistent request/Event/allocation
history claiming another ERC-20 must HOLD. The source-only classifier also
binds transfer amount, source transaction, nondefaulted source chain, log index
and delivery addresses. A legacy request
without a recorded original USDC contract remains source-HOLD, even if a
later request snapshot backfills that field. A separately reviewed trusted
request/policy migration would be required rather than guessing from later
request bytes or an event. Aggregate verified obligations must not exceed 10,000,000 VOID.

**Exact committed event hash** is SHA-256 of the existing serialized
`payment_verified` operator-event JSONL row **including its terminating LF**.
No timestamp, hash-shaped reference or summary supplied outside those bytes
can replace the event identity. A later trusted integration must verify that
the same exact byte definition is used by the #2433 allocation planner and
publisher before any production admission.

The classifier first validates the **original allocation bytes** using the
same strict UTF-8, LF-terminated and JSON.stringify-roundtrip checks applied
to request and event histories. The existing #2433 hash-chain parser also
compares parsed records against canonical serialization, but uses a nonfatal
UTF-8 decode; the new precheck rejects malformed bytes before accepting a
canonical allocation identity. It then validates the entire canonical
allocation JSONL with the merged #2433 hash-chain classifier. Each existing allocation must match one verified
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
source-head/diff hygiene. For pull requests it checks the exact BASE→HEAD
committed diff. For manually dispatched checks (which have no PR base/head),
it verifies the last committed HEAD^→HEAD diff only; a manual dispatch does
not qualify an entire PR range. Both paths reject whitespace errors. The proof covers first missing allocation, exact
matching history, deterministic replay, changed event bytes, duplicate identity,
request/receipt/amount/quote drift, wrong native-USDC chain contract,
self-consistent forged non-USDC ERC-20 claims, malformed or missing launch authority
at the empty-ledger crash gap, request-token vs event-token mismatch,
duplicate/regressed/nonconsecutively replayed request snapshots, semantically
identical launch member permutations and real launch-value drift, original
USDC-contract and launch-authority backfill scoped to the target or any
verified/allocation obligation (without globally rejecting unrelated
unverified legacy requests), conflicting source-chain aliases,
conflicting/orphan allocations,
noncanonical and truncated JSONL, near-sellout conservation and the absence
of runtime, funds and host authority.

**PROTECT THE CORE.**
