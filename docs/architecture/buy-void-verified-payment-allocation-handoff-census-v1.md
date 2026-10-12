# Buy VOID verified-payment → allocation publication handoff census V1

This is a **source-only negative launch gate**, not a production allocation
writer or release. It documents the exact non-wired boundary in
[issue #2432](https://github.com/6ZoSo9/void-node/issues/2432)
at the source snapshot of `main` commit
`f7c894eb2ff8f378b2f0a906192cc1a0602e1d24`.
All three reviewed source Git blobs are frozen within the test.

## What already exists

`src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
(Git blob `617e401c3202e34e8754e988cea66c9caa02f873`) implements an
independent serialized capacity/duplicate admission boundary. The new-payment
operation appends a canonical `payment_verified` event with
`fs.fsyncSync(operatorLedger.fd)` and
`fs.fsyncSync(operatorLedger.directory.fd)`. This is a source contract;
the proof does not access the actual mounted operator ledger or independently
attest an installed service.

`src/economic/buy_void_allocation_reservation_publication_writer_v1.ts`
(Git blob `59b336eb82222bf0f5bcfe37060ec520c54e9b62`) implements a
**separate**, source-only allocation publication writer with redundant
publication intent and ledger/high-water recovery. Its own authority truth
states `runtime_integration=false`,
`payment_verified_event_write=false` and
`production_gate_ready=false`. It has **not** been mounted in the
payment-admission callback.

`src/economic/buy_void_verified_allocation_replay_binding_v1.ts`
(Git blob `feb1f0e3fea1ff07406cd3b8fcd315c48338596f`) classifies
byte-exact request/payment/allocation histories. With an exact durable
payment event but no matching reservation it reports
`verified_allocation_missing` with
`verified_allocation_requires_protected_recovery`, not success.

## Observed missing handoff

Within `withBuyVoidVerifiedPaymentCapacityAdmissionV1`, the branch
`if (alreadyVerified)` returns `idempotent: true` BEFORE calling
`input.operation`. The public writer wrapper
`writeBuyVoidOperatorEventWithCapacityAdmissionV1` handles this return by
running `recoverPaymentVerifiedSidecarsV1` only, then returning success;
there is **no canonical allocation writer call** on this replay.

In the new-payment branch, the durable payment event append/descriptor fsync
is proven in source, but allocation publication is **not performed** before
the wrapper returns. A crash between these operations can leave a paid
finite-capacity obligation without a canonical allocation record, and the
existing idempotent path will not repair it. This is the already recognized
#2432/#2615 source/runtime gap, *not a claim of actual paid customer loss*.
No live request/ledger files are inspected here.

## Next required source/runtime integration

The eventual producer must, within the **same** ordered capacity/duplicate
serialization domain:

1. Read authoritative original request and complete `payment_verified`
   event/history from retained bounded descriptors. Independently bind
   source-chain, native-USDC rail, payment identity, quote and coupled
   launch-generation authority.
2. On a NEW payment: require capacity admission, append and fsync exact
   `payment_verified`, then plan one canonical `allocation_reserved`.
   Compose the reviewed allocation writer's **two pinned custody-root locks**
   in a defined global order to avoid deadlock across payment and allocation
   recovery. Never accept caller-supplied green booleans in place of history.
3. On an ALREADY-FSYNCED verified payment: under the same capacity lock,
   compare exact request/payment/allocation history and high-water. If
   allocation is missing, reconstruct and publish the SAME deterministic
   allocation, without a second verified-payment event or additional
   capacity obligation. An existing matching allocation is idempotent.
4. After durable ledger + high-water + independent witness/postchecks, and
   only then sidecar/public response, return success. Any crash or ambiguous
   filesystem/read/receipt condition must HOLD until exact replay succeeds.
5. Qualify adversaries: payment fsync→allocation crash, allocation
   fsync→sidecar crash, request/payment identity collision, orphan allocation,
   source/drift/rollback, root/ancestor swap, sellout concurrency, and
   independent custody/witness mismatch, with negative cases enforcing
   `production_gate_ready=false`.

The existing allocation publication writer has no authority to create a
payment capacity obligation. Integrate only after reviewing lock hierarchy,
customer/source identity, physical parent directory and witness custody.

## What this PR tests and does NOT do

The new script requires exact source Git object identities, checks source
function boundaries and the verified-event file+directory fsync source,
the current idempotent early return and sidecar-only recovery, and independent
allocation publisher's still-unmounted truth. It tests four in-memory
synthetic source mutations must HOLD (no checkout file mutation).
CI independently runs Node22/24/26 with no `npm` install and compares the
three source-only receipts byte-for-byte.

These checks **intentionally describe an unresolved blocker**. If a future
integration rewires the handoff, the source pins/missing-path assertions must
FAIL until replaced by a reviewed positive durability/end-to-end proof.
Do not treat a green negative census as launch readiness.

All authority fields remain false, including actual event read/fsync
verification, `allocation_record_written`, protected custody high-water,
`exactly_once_allocation_production_ready`, `presale_activation`,
and `funds_moved`. No data, signer/wallet, transaction, Chain-2050/WC,
service, host, inventory/treasury/liquidity, presale/market or funds
operation is performed. Keep this PR Draft/unmerged until reviewed.

**PROTECT THE CORE.**
