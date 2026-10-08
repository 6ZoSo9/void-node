# Buy VOID payment → allocation pure crash-cut matrix V1

## Why this exists

Current source has a durable `payment_verified` admission writer and a
separate allocation-reservation publication writer, but the former does not
invoke the latter. Exact replay can therefore see a verified payment with
no corresponding allocation. [Issue #2432](https://github.com/6ZoSo9/void-node/issues/2432)
owns this missing durable handoff; source-only [Draft #2649](https://github.com/6ZoSo9/void-node/pull/2649)
detects that gap.

This follow-up Draft is **pure synthetic interoperability proof**, stacked
directly on #2649, not a runtime integration or permission to publish.
It reuses the EXISTING canonical `voidpay1` payment identity, `voidalloc1`
allocation ledger planner, replay-binder and dual-root publication-protocol
phase classifier without inventing a second ledger or output identity.

### Exact source inputs frozen at main `f7c894eb2ff8f378b2f0a906192cc1a0602e1d24`

- `src/economic/buy_void_allocation_reservation_ledger_v1.ts` — Git blob
  `c3fc204710a9189723651cfeb6ffc52b1aa049db`.
- `src/economic/buy_void_verified_allocation_replay_binding_v1.ts` —
  `feb1f0e3fea1ff07406cd3b8fcd315c48338596f`.
- `src/economic/buy_void_allocation_reservation_high_water_v1.ts` —
  `9383c94cf848efb9a0112f1b741df4e10f790ac6`.
- `src/economic/buy_void_allocation_reservation_publication_protocol_v1.ts` —
  `b0fe98427a7bdf1c39c41fb64e94f3f142d6636b`.

The synthetic fixture uses Base native USDC, its already-established
canonical launch-authority schema, original request, matching payment
receipt/log and an exact accepted event JSONL line. It **models** an
already-fsynced event; it cannot verify that a real write happened.

## Expected pure crash-cut outcomes

1. No `payment_verified` event: strict classifier **HOLDS**; no allocation.
2. Payment-event bytes present, allocation ledger empty: classifier returns
   `verified_allocation_missing`, not successful allocation.
3. The existing pure reservation planner derives one exact
   `allocation_reserved` record from the original request, canonical
   payment identity, exact event-line SHA256 and locked synthetic launch
   authority. It performs **no write**.
4. Publication protocol transitions through
   `intent_only → ledger_committed → complete`. A ledger append without
   current high-water remains *incomplete*, even if the separate replay
   classifier already recognizes an allocation row.
5. Replaying after both hypothetical roots committed returns the exact
   already-present record and an idempotent no-append allocation plan.
   Changing the request, payment hash, quote, launch generation, event
   digest or pool HOLDs, as does an orphan/malformed allocation history.
6. The canonical planner enforces a hypothetical 10,000,000 VOID
   sellout limit in integer micro-VOID arithmetic; this does NOT prove
   a shared live capacity lock, actual original requested quote, or
   correct response after a power failure.

The script writes only one machine-readable JSON receipt to **stdout**.
It does not touch any request or event history, reserve inventory,
open custody files, call an RPC, read a customer record, or emit a
production `allocation_reserved` row. CI runs three independent Node
22/24/26 builds and requires complete JSON-byte equality.

## What is still blocked

Everything security-critical outside pure simulation remains FALSE:
`actual_durable_payment_fsync_verified`,
`verified_capacity_and_request_locks_held`,
`independently_proven_original_request`,
`protected_high_water_custody_verified`,
`allocation_publication_integrated`,
`exactly_once_allocation_production_ready`,
`production_source_finality_authority_ready`, and `presale_activation`.

A real implementation must hold the SAME capacity/duplicate/request/launch
serialization authority across payment fsync and allocation publication;
replay must repair a missing allocation exactly once without adding a
second payment obligation. It must use descriptor-bound, independent
high-water and witness custody, qualify first-original accepted request
history, and test actual filesystem crash cuts, rollback, duplicate
identities and near-sellout on the production application boundary.
Untrusted booleans in this **synthetic-only** planner fixture are never
treated as real authority.

A successful test proves only that existing **pure contracts are
composable** in fixed test inputs; it does not close issue #2432.
Historical payment/fulfillment/allocation identities remain unchanged.
Do not mark Ready, merge, deploy, authorize payment, sign, broadcast,
fund a presale, activate WC/VOID, or move money.

**PROTECT THE CORE.**
