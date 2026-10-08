# Buy VOID operator dispatcher pre-serialization budget negative V1

## Why this security proof exists

[Draft #2676](https://github.com/6ZoSo9/void-node/pull/2676) stages an
**UNMOUNTED** operator `payment_verified` → allocation dispatcher. It
correctly routes exact payment status into the protected payment/allocation
handoff, keeps nonpayment status separate, snapshots callbacks once and
requires canonical server-controlled custody roots.

The independent
[P2 resource-bounds review](https://github.com/6ZoSo9/void-node/pull/2676#pullrequestreview-5464093008)
found a different issue. The dispatcher currently executes
`JSON.stringify(value)` **before** checking whether the serialized UTF-8
length exceeds 256 KiB. That limits *accepted* object bytes, not memory
allocated or arbitrary callbacks invoked during serialization.

This is a disposable synthetic **negative reproduction** against the
*actual exported planner*, not a source patch or a live request.

## Exact provenance

The source-only child is stacked on the current #2676 branch head
`344679b82fc988c5ed788aee0eb8e6618a89a64b`. Its planner source
Git blob is pinned to `5005fc05c8ad22e4301f2141678d87c88fef0a16`.
All existing dispatcher, writer, operator router, custody, deployment and
historical-attestation bytes remain unchanged in the negative witness.

## Negative assertions

`scripts/prove_buy_void_operator_dispatch_prebudget_negative_v1.ts`
imports and invokes the **real**
`planBuyVoidOperatorAllocationDispatchV1` with inert objects only. It
checks the actual source Git blob and the precise serialize-before-size
ordering. A valid, small synthetic event/request succeeds as a frozen
allocation-handoff plan; the actual writer is **never called**.

Three separate oversize cases then use an event `toJSON`, a request
`toJSON` and an enumerable event getter. In each case, a synthetic callback
generates a 4 MiB field, the *real* dispatcher serializes more than 4 MiB,
and only afterward throws the expected `*_size_exceeded` error. The
test temporarily wraps `JSON.stringify` to capture the actual full
materialized string length and restores that builtin in a `finally`
clause. It also proves callback/getter side effects happened **before**
the rejection. A finite ~12,000-level deep object reaches the JSON
serialization engine and throws `*_serialization_failed` rather than a
separately reviewed pre-serialization depth limit.

The independent exact-head Node 22/24/26 workflow requires each negative
reproduction and complete byte-identical receipts. **GREEN on this test
means the resource-bound defect was reproduced**, not that it is repaired.
A historical unrelated workflow failure is not silently waived.

## Narrow owner-lane remediation before route mount

A subsequent owner-reviewed source fix must either establish a
strictly bounded and trusted plain-data DTO at the integration boundary
before invoking `JSON.stringify` or prequalify a closed event/request
schema with bounded depth, field/key counts, primitive text lengths and
running serialization-byte budget. Do **not** evaluate arbitrary
`toJSON` functions or property accessors on untrusted caller data and
claim the operation is memory- or time-bounded. An arbitrary Proxy can
also have observable traps; any accepted in-process trust assumption
must be explicit and independently qualified.

The repair must preserve exact payment/nonpayment status admission, one
immutable request/event lineage across payment fsync and allocation,
server-owned custody roots, launch-authority identity, protected
antirollback high-water and crash/replay recovery. It must not rewrite
historical customer records or convert an unmounted helper into a
production mutation without authentication and deployment qualification.

No operator host or service, live payment, customer/ledger data,
wallet/key/signer, transaction, Chain2050/WC, inventory/treasury,
presale/market or funds action occurs here. Keep Draft/unmerged.

**PROTECT THE CORE.**
