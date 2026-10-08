# Buy VOID original buyer lineage before payment fsync — candidate-only V1

## Source-only purpose

This Draft is stacked on [payment-to-allocation handoff #2654](https://github.com/6ZoSo9/void-node/pull/2654)
at exact head `b2571e8ee9c352bd9b78ce8f0c87f2487e3f8ded`.
The first implementation of `writeBuyVoidVerifiedPaymentAllocationHandoffV1`
holds the reviewed global capacity and per-request bakery locks but verifies
only request ID/quote/source-chain/transaction/duplicate/capacity before the
**irreversible** `payment_verified` JSONL append/fsync. Its full strict
original buyer/receipt/launch replay classifier is invoked later during
allocation publication. An invalid event could therefore be rejected only
**after** it has already become durable.

The separate pure-reference [Draft #2661](https://github.com/6ZoSo9/void-node/pull/2661)
passed 15/15 Node22/24/26 workflows, demonstrating the exact in-memory
pre-append replay decision on a valid request and ten malformed variants.
This Draft integrates that **same** strict, existing
`classifyBuyVoidVerifiedAllocationReplayBindingV1` into the real unmounted
handoff before `appendPaymentVerifiedEventDurableV1`. No new currency or
identity format, no relaxation of the strict classifier and no real endpoint.

## Exact change boundary

Source:
`src/economic/buy_void_verified_payment_capacity_admission_v1.ts`.

The added
`assertBuyVoidVerifiedPaymentPreappendOriginalLineageV1` runs under the
**existing** global payment-capacity bakery lock, launch assertion and
request lock, after prior-allocation completeness admission, immediately
before payment fsync. It obtains a separate current dual-root allocation
snapshot through the already-reviewed publication writer. It asks the
same strict classifier to classify the pinned original request JSONL, the
pinned prior operator JSONL with the proposed **exact event-line bytes
appended in memory only**, and the allocation snapshot. Admission requires
`status=verified_allocation_missing`, exact request ID and exact
`sha256(JSON.stringify(event)+"\\n")` digest. The classifier
enforces original native USDC rail/receiver/buyer/amount/quote/log identity
and launch-generation history.

It also binds the **separate caller request object** used by the allocation
planner against the first durable buyer snapshot and the final historically
bound transaction snapshot. It compares request ID, source/payment chains,
delivery wallet, receive address, USDC contract, micro-unit exact amounts,
submitted transaction and the full nine-member coupled-launch tuple.
Original missing token/launch may never be upgraded by later request rows.
Replays with an **already durable** historical payment do not rerun a
fresh launch assertion and retain the existing idempotent allocation/sidecar
repair path.

New **test-only** file
`scripts/prove_buy_void_preappend_original_lineage_real_fsync_v1.ts`
inherits the already-reviewed real temporary-filesystem positive/crash/replay
handoff proof and adds five independent adversaries: forged V2 sender,
altered caller buyer address, altered caller launch generation, missing
first-original launch and missing first-original native token. Every invalid
attempt MUST HOLD before the `test_only_after_payment_fsync` hook fires,
with zero bytes in the payment operator ledger, zero allocations and no
sidecar. Correct replay from the unchanged temp history must subsequently
append **one** payment and **one** allocation without duplication.

The exact-head workflow rebuilds Node 22/24/26, typechecks, reruns this
real fsync/sidecar/allocation and crash-recovery suite on **disposable**
`os.tmpdir` roots, and requires byte-identical evidence across all nodes.
The entire source remains unmounted and no customer record is opened.

## Authority limits

A successful local/hosted source proof closes only a narrowly proposed
original buyer pre-fsync *ordering* problem. It does **NOT** prove
installed production service behavior, verified RPC receipt/finality,
current launch lease in a deployed instance, capacity custody/race across
all installed hosts, real original request provenance across systems,
protected high-water external witness acceptance, wallet/signer
configuration, chain transaction or automatic fulfillment. Historical
custody writer V1 pinned SHA checks are intentionally left untouched.
A separate current writer generation and exact host/runtime deployment
attestation remain required.

Existing non-payment `writeBuyVoidOperatorEventWithCapacityAdmissionV1`
and existing public Buy VOID operator routes are NOT modified here.
Any required mounted production integration must be reviewed separately.
No Ready, merge, deployment, payment, signer, keys, wallet, customer
ledger, transaction, Chain-2050/WC, presale/market, inventory/treasury
or funds action.

**PROTECT THE CORE.**
