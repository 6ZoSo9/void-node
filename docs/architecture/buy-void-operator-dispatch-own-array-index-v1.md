# Buy VOID operator allocation dispatcher — own-index snapshot repair V1

## Narrow source-integrity issue

The cumulative presale integration [Draft #2761](https://github.com/6ZoSo9/void-node/pull/2761)
has an *unmounted* verification-to-allocation dispatcher in
`src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts`.
Its existing `detachedBoundedJsonValueV1` logic validates only own dense
array property descriptors and shadows `toJSON`, but it then fills a fresh
array using `clone.push(...)`. That method is resolved through mutable
`Array.prototype.push`, while native push can write to an empty indexed
slot via an inherited `Array.prototype["0"/"1"]` setter. Such pollution
can execute ambient code or silently lose an own element **after** input
validation but **before** admission/JSON commitment.

An independent scoped source review on the original parent documented the
[inherited-setter finding](https://github.com/6ZoSo9/void-node/pull/2761#issuecomment-6100145551).
This is an **in-process JavaScript prototype-contamination boundary**,
not an allegation that a live HTTP client supplied getters or a real buyer
payment was lost.

## Exact one-hunk source correction

The prior dispatcher source Git blob is
`0e27a76e777c326d2d9e2b1550b7f2979fca9abb`.
This scoped successor changes only its **single array-fill block**:
first recursively snapshot the already-reviewed own data descriptor,
then call `Object.defineProperty(clone, String(index), {value,...})`.
The new compiled array has ordinary dense, enumerable OWN index fields,
no inherited numeric setter/ambient push dispatch, preserved index order,
the same JSON output, unchanged `toJSON` shadow and subsequent deep freeze.
All original maximum depth, key/node/byte/array bounds and source checks remain
unchanged.

This module has **not** been mounted into the live operator route. Its
verified-payment branch still selects the separately held
`writeBuyVoidVerifiedPaymentAllocationHandoffV1` only when future reviewed
operator/IPC/custody integration grants actual trust. No source-only proof
can authorize a payment, reserve a token or trigger the legacy writer.

## Actual compiled test and falsification

`scripts/prove_buy_void_dispatch_own_array_index_v1.mjs` imports the
**actual freshly compiled** dispatcher and calls
`planBuyVoidOperatorAllocationDispatchV1()` on synthetic reviewed/
payment-verified and nonpayment/reviewed fixtures without executing the
writer. It compares complete event/request JSON bytes with an unpolluted
baseline; checks own frozen nested 0/1 indexes, nonenumerable undefined
`toJSON` shadow and exact branch selection.

The test installs inherited numeric setters at indexes 0 and 1 in the
test process, separately proves the setter controls are armed using a
throwaway native-push array, then requires **zero** marker setter calls
during actual dispatcher planning. A separately replaced
`Array.prototype.push` throws if the dispatcher tries to push the
synthetic marker; no such call is allowed. Test scope restores the original
prototype descriptors in `finally`; no real customer, ledger or service
exists in the fixture. All production authority flags stay false.

The exact-head Node 22/24/26 GitHub workflow independently compiles the
repository, tests the actual module and compares complete proof transcripts
byte-for-byte. The old source-hash-bound predecessor proof, if it fails due to
the new module bytes, is valid historical hold evidence and must not be
silently repinned. A separately reviewed current-generation contract and
cumulative #2761/#2762 reconciliation is needed before source adoption.

## Production authority remains false

This standalone patch **does not** mount a verified-payment dispatcher or
close the original buyer/USDC source-finality, operator principal,
`payment_verified` fsync -> `allocation_reserved` shared-lock handoff,
protected launch high-water, crash replay, Nimo installed authenticated
V2 witness, treasury, or coupled WC/VOID market opening. It does not edit
custody/ledger service binaries or historical V1/V2 manifests.

No Ready, main merge, operator-host/service, wallet/key/signer, funds,
transaction, Chain-2050/WC, live buyer data, inventory/treasury/liquidity,
presale/market action is included.

**PROTECT THE CORE.**
