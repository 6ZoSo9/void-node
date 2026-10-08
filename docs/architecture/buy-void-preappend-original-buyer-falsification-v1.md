# Buy VOID original buyer provenance — negative pre-append falsification

## Scope and exact parent

This **test-only, unaccepted** Draft is stacked directly on
[Draft #2654](https://github.com/6ZoSo9/void-node/pull/2654)
exact head `b2571e8ee9c352bd9b78ce8f0c87f2487e3f8ded`.
That owner PR introduces the unmounted durable `payment_verified` →
`allocation_reserved` handoff and a real fsync/crash-recovery test.

The separate code-review concern is *ordering*: a valid canonical payment
identity (chain/transaction hash/log index) alone is not full original
payment/buyer lineage. The initial capacity guard currently compares durable
request ID, quote, source chain and tx hash, while the exact binding of
`payment_verifier.from_address`, `payment_verifier.delivery_address`,
amount, USDC contract and the original buyer request appears in the later
allocation replay classifier. An invalid candidate event or caller request
may therefore be recognized as invalid **only after** its `payment_verified`
row was durably appended.

## Test cases (disposable filesystem only)

`scripts/prove_buy_void_preappend_original_buyer_falsification_v1.ts`
creates a private OS-temp request ledger, an allocation ledger, and its
independently initialized high-water file. It invokes the real **unmounted**
source `writeBuyVoidVerifiedPaymentAllocationHandoffV1()` with the same
minimal inert launch-assertion callback from the owner's own test harness.

It uses two adversaries against a fully valid original durable request:

1. The candidate event uses the **same request ID, canonical chain, tx,
   log index and quote** but an **unrelated from_address** in its verifier.
2. The candidate event is correct, but the supplied request object has a
   different delivery wallet from the original durable request history,
   while preserving request ID, chain, tx and quote.

Expected *negative evidence* at the current source generation: the handoff
rejects the invalid lineage, **but only after the payment append/fdatasync
hook was reached**. The test then inspects the durable operator JSONL and
confirms a row remains while independent allocation replay denies source
lineage. Retrying with the honest event must not erase that historical row.
No production-custody path, external customer record, signer, wallet, or
chain state is touched.

**If the first independent hosted run does not reproduce these facts, it
must fail rather than invent a P1 report.** No source authority or proof
claim is made until the exact-head test has passed.

## Required owner-side acceptance improvement

Before **any** irreversible payment-event append, the handoff must bind the
candidate complete canonical V2 event to the original durable request
history (including verified sender, delivery, receiver, token, exact
amount/quote and original coupled-launch lineage) and bind the supplied
request to the same original durable buyer/launch data. One safe
review direction is a *read-only, synthetic in-memory candidate append*
evaluated by the strict replay classifier, plus a distinct canonical
durable-request versus supplied-request comparison **inside the existing
global capacity/request lock**. This is a proposal, not an implementation.
Do not simply waive a postappend replay hold or silently rewrite the
historical buyer's request.

The owner can use the negative report to add fail-closed pre-append checks
and update/replace this witness once its new source actually prevents
poisoning. The original payment-capacity and allocation durability tests
must remain green.

## Authority boundary

This proof does **not** change either existing source implementation, the
allocation high-water semantics, operator admission, signer, runtime mount,
chain, or economic constants. This is a **negative diagnostic**, not a
successful presale launch gate. Any reproducible history corruption is a
production HOLD.

`PREAPPEND_ORIGINAL_BUYER_LINEAGE_SAFE=false`.
`production_ready=false`. No merged, deployed or hosted operator action.
No real customer ledgers, credentials, wallet, transaction, treasury,
liquidity, Chain2050/WC, presale/market activation, or funds movement.

**PROTECT THE CORE.**
