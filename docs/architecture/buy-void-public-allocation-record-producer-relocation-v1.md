# Buy VOID public allocation-reservation proof: canonical V2 producer relocation

## Exact source reason

The public allocation-reservation contract from the earlier source
generation asserted the literal `operator_status: "payment_verified"` appeared
directly in `src/index.ts`. That was true before the verified-payment event
constructor was extracted into its independently reviewed TypeScript module.
It is no longer true at the exact Buy VOID integration [Draft #2675](https://github.com/6ZoSo9/void-node/pull/2675)
commit `884edc6e82bd505a83e51a44b38f7e318431f314`.

This was a **source proof location drift**, not permission to remove the
canonical payment status or activate an allocation. On the reviewed integration
head, `src/economic/buy_void_verified_payment_v2.ts` (Git blob
`550ede02fc0b7d6874c324af58b5ef9c5591b311`) owns the typed
`BuyVoidVerifiedPaymentEventV2` constructor, including
`operator_status: "payment_verified"` and `payment_verified: true`.
The operator route in `src/index.ts` imports and invokes the same builder,
and still passes the resulting event through
`writeBuyVoidOperatorEventWithCapacityAdmissionV1`.

## Narrow safe source proof

The existing historical public-facing source-only proof keeps all
**74 other original** positive source assertions, all explicit
`write_enabled=false`/wallet/signer/market prohibitions, public route
shape, upstream payment/duplicate/capacity HOLDs and public documentation
requirements. It changes **only** the obsolete source-file assumption:

- The canonical payment status and boolean must occur together inside a
  typed `const event: BuyVoidVerifiedPaymentEventV2 = {...}` construction
  in the reviewed V2 source file.
- The current router must import V2, invoke
  `buildBuyVoidVerifiedPaymentEventV2({request:found,...})`, and retain the
  reviewed capacity-admission event writer.
- The public route's existing `allocation_reservation_record_write_enabled:
  false` and all other launch/monetary false flags remain required.

The added source-only Ubuntu CI runs the actual 8 KB historical public
contract proof and positive controls. It copies only the inspected repo
files into an OS-temp fixture, corrupts the canonical typed V2 status,
and requires **HOLD**, then restores V2 but disconnects the canonical
mounted V2 call and requires **HOLD** again. There are no RPC requests,
real customer files, node process starts, service changes, or dependency
installation. It does not weaken an immutable V1 runtime witness or the
historical V5/V4 compiled attestations.

## Remaining launch trust boundary

This test proves a **public shape-only contract remains semantically linked
to the relocated source**, not that the canonical payment was durably
recorded, that the original buyer request is trustworthy, or that an
`allocation_reserved` event exists. The verified-to-allocation
dispatcher in #2675 is unmounted. High-water anti-rollback,
cross-process custody lock, Nimo witness, real paid source finality,
independent signer/treasury controls, and coupled WC/VOID opening must
still pass their separate real-host acceptance gates.

Draft/source CI only. No Ready/merge, deployment, signer, wallet, key,
customer ledger, allocation write, transaction, market, treasury,
Chain-2050/WC or funds movement.

**PROTECT THE CORE.**
