# Buy VOID preappend event CHECK → durable APPEND reserialization negative V1

## Scope and concern

This Draft is a **negative source-falsification proof only**, stacked on
[Draft #2663](https://github.com/6ZoSo9/void-node/pull/2663) exact
head `11ae2d06d361b06a2c5acbdb85bd4148f6950131`. It does
NOT edit the owning verified-payment handoff, replay binder, allocation
publication writer, operator routes, historical custody manifest, or
production runtime.

#2663 improves the durable payment→allocation handoff by requiring
canonical first-original buyer/receipt/native-USDC/launch lineage before
the irreversible operator `payment_verified` append+fsync. The
new `classifyBuyVoidPreappendVerifiedPaymentLineageV1` constructs an
exact event JSONL line with `JSON.stringify(candidateEvent)+"\\n"`
and qualifies that line. **However**, the subsequent actual
`appendPaymentVerifiedEventDurableV1` independently calls
`JSON.stringify(event)+"\\n"` for the fsync, and the allocation
planner/sidecar may serialize the same live `event: any` object again.

A mutable internally supplied JS object with a custom `toJSON()` or
getter can return a legitimate buyer when the validator serializes
the first time, then a different buyer when the ledger appends. The
capacity/request bakery locks serialize *filesystem mutations*, not
the immutable identity of a caller's JS object. This is a
**source-API adversarial condition**; it is not evidence that an
external malicious payer can currently inject a `toJSON` function
through public JSON, or that any live payment has been corrupted.

## Exact real temporary-filesystem negative witness

The added `scripts/prove_buy_void_preappend_event_reserialization_negative_v1.ts`
uses the actual unmounted
`writeBuyVoidVerifiedPaymentAllocationHandoffV1` source, unmodified
verified-allocation replay classifier, and fresh synthetic request,
operator, allocation and high-water directories under `os.tmpdir()`.
The ordinary plain-data original verified event **must succeed** with
one durable payment row and one allocation.

The adversarial variant supplies the *same top-level event fields*
and verifier as the valid control, plus a non-enumerable `toJSON()`:
the first serialization returns the correct original sender; later
serializations return a different synthetic sender. The witness
checks the actual fsync hook, reopens the synthetic JSONL, and requires:

- the bad sender was durably appended despite pre-fsync qualification;
- the actual durable JSONL bytes differ from the original validated
  event-row bytes;
- the strict replay classifier correctly rejects the resulting bad
  original-buyer lineage, but only AFTER the irreversible payment row;
- a subsequent correct replay cannot silently erase that historical row.

**Expected negative-witness GREEN means the defect REPRODUCED**, not that
the production buyer/payment gate passed. If the owning writer is fixed
and the bad row no longer appends, this negative reproduction is expected
to fail and should be replaced by a positive fail-before-fsync regression.

The exact-head GitHub workflow runs Node 22, 24, 26 from locked checkout,
confirms the owning writer+replay file Git blobs, executes real synthetic
temp-fsync proof, and compares three result receipts byte-for-byte.
The scripts NEVER contact a public chain, customer ledger, installed
host, RPC, wallet, signer, key, payment or funds service.

## Required follow-up in the owning lane

One safe design is to bind **the exact canonical proposed event bytes**
inside the capacity+request serialization, validate those bytes once,
and pass the SAME immutable bytes/parsed immutable snapshot through
payment append+fsync, allocation record planning and sidecar publication.
Reject callbacks/proxies/getters/`toJSON` on caller-controlled structures
or otherwise explicitly normalize untrusted inputs into a reviewed
immutable plain-data snapshot BEFORE any durable write. A second
`JSON.stringify` of the original live caller object must not select
different bytes after the preappend decision. Maintain strict
original-request chronology, receipt and native USDC semantics, and
the existing postappend defense-in-depth replay verification.

Requalify under actual OS-temp fsync (including a custom `toJSON`
and a mutate-on-access getter), then independently review before
reconciling #2662/#2663. Protected host high-water, custody trust,
correct original buyer, operator principal authorization, real finality
and exactly-once production reservation remain separate HOLDs.

No Ready, merge, deployment, actual customer data, private keys,
wallet/signer, transaction, Chain-2050/WC, inventory/treasury,
presale/market activation or funds action.

**PROTECT THE CORE.**
