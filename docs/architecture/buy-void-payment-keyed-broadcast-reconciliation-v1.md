# Buy VOID payment-keyed broadcast reconciliation v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1`

Status: source-only, reconciliation-only. It never signs or submits a
transaction.

## Purpose

Recover safely after the merged payment-keyed guarded-broadcast lane has
durably committed `broadcast_intent_committed`.

The reconciliation decision combines three independent evidence sources:

1. the append-only delivery submission-guard journal;
2. the private broadcast-evidence journal; and
3. read-only exact-hash Chain-2050 inspection.

No one source is allowed to overclaim what it proves.

## Submission-guard evidence

The payment-keyed submission guard is written and fsynced before the broadcaster
call.

Therefore:

- **no matching claim** after a durable saga broadcast intent proves the
  broadcaster boundary was never entered;
- a matching **retry-safe release** proves the prior submission attempt ended in
  a definitive no-submission result; and
- an active matching **claim** means submission may have occurred and never
  authorizes retry by itself.

The reconciler reads the guard journal only. It does not claim or release it.

Foreign adapter entries or a changed idempotency/hash/plan binding for the same
attempt fail closed.

## Payment-keyed Chain-2050 inspection

The new inspector uses only:

```text
eth_chainId
eth_getTransactionByHash
```

over the same server-controlled loopback RPC policy already bound by the
payment-keyed preparation policy.

An observed transaction must exactly match the durable custody request:

- transaction hash;
- fulfillment wallet sender;
- fulfillment contract target;
- type-2 transaction;
- chain ID 2050;
- nonce;
- gas limit;
- max fee;
- priority fee;
- zero native value; and
- exact payment-keyed fulfillment calldata.

A transaction that is present but does not match those fields is held.

A transaction that is absent is **unknown**. RPC absence is never treated as
proof that submission did not occur and never authorizes retry.

## Recovery cases

### Guard never claimed

If the saga has a durable broadcast intent but the exact payment-keyed guard
binding has never been claimed:

```text
guard never claimed
  -> persist not_submitted evidence
  -> keep execution attempt prepared
  -> append saga broadcast_not_attempted
```

No Chain-2050 RPC call is needed.

### Guard released

A retry-safe payment-keyed guard release for
`broadcast_definitively_not_submitted` or
`invalid_provider_submission_id` is definitive no-submission evidence.

The reconciler persists not-submitted evidence with
`submission_call_performed=true`, keeps the attempt prepared, and appends
`broadcast_not_attempted`.

No Chain-2050 RPC call is needed.

### Active guard claim, transaction absent

The reconciler performs exact-hash inspection.

If `eth_getTransactionByHash` returns null, the result remains unknown:

- no retry authorization;
- no guard mutation;
- no submission;
- no signer access; and
- no saga not-submitted event.

Existing durable unknown evidence is projected into the canonical execution and
broadcast-outcome journals if that projection was interrupted earlier.

### Active guard claim, exact transaction visible

Exact Chain-2050 visibility is recorded as accepted evidence, then projected to
the canonical execution/broadcast-outcome journals, and finally appended to the
saga as `broadcast_accepted`.

The reconciler still performs no submission.

## Durable evidence repair

Existing durable evidence is authoritative for recovery ordering:

```text
durable evidence
  -> repair missing execution/outcome projection
  -> repair missing saga event
```

Existing accepted evidence requires no Chain-2050 RPC to complete missing local
projections.

Existing unknown evidence first repairs the canonical unknown projection. Chain
inspection may then promote the evidence monotonically from unknown to accepted.

## Deliberate receipt boundary

This lane stops at accepted/unknown/not-submitted broadcast state.

It does not accept successful fulfillment receipts and does not classify
reverted receipts. Those remain the next payment-keyed gate, using the existing
strict fulfillment receipt verifier and an explicit revert path.

This separation prevents generic native-transfer receipt assumptions from
leaking into fulfillment-contract semantics.

## Explicit non-authority

This lane has no:

- signer dependency;
- credential or wallet access;
- submission-guard mutation;
- broadcaster dependency;
- transaction submission;
- raw signed transaction reconstruction;
- automatic retry;
- receipt acceptance;
- inventory mutation;
- public fulfilled closeout;
- runtime route or canonical parent mount;
- deployment or service action; or
- money movement.

The focused proof uses injected read-only Chain-2050 observations only.
