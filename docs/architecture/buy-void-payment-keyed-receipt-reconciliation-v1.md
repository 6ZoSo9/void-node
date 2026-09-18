# Buy VOID payment-keyed receipt reconciliation v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1`

Status: source-only receipt/revert reconciliation. No runtime route or canonical
parent dispatch is mounted.

## Purpose

Advance an already-broadcast payment-keyed fulfillment from accepted/unknown
broadcast state to one terminal delivery truth:

- confirmed payment-keyed fulfillment; or
- definitive Chain-2050 revert.

This lane deliberately stops before inventory decrement and public Buy VOID
fulfilled closeout.

## Policy binding

The receipt policy is server-controlled and must bind the same:

- loopback Chain-2050 RPC endpoint;
- fulfillment wallet; and
- fulfillment contract

as the already-durable payment-keyed preparation policy.

The receipt policy additionally binds:

- the reviewed VOID token address; and
- the minimum receipt confirmation floor.

The receipt policy has its own SHA-256 fingerprint. Apply requires the exact
runtime-policy, preparation-policy, and receipt-policy fingerprints returned by
dry run.

## Exact transaction visibility

Before any receipt is accepted, the payment-keyed Chain-2050 inspector must
observe the exact prepared transaction:

- exact transaction hash;
- exact fulfillment-wallet sender;
- exact fulfillment-contract destination;
- EIP-1559 type 2;
- chain ID 2050;
- exact reserved nonce;
- exact gas limit and fee envelope;
- zero native value; and
- exact payment-keyed `fulfill(bytes32,address,uint256)` calldata.

A transaction absent from `eth_getTransactionByHash` is pending. Absence never
proves non-submission and never authorizes retry.

## Successful receipt

Status 1 reuses the existing strict payment-keyed fulfillment receipt verifier.

It requires:

- exact transaction hash;
- exact fulfillment wallet;
- exact fulfillment contract;
- exact reviewed VOID token;
- exactly one matching VOID `Transfer`;
- exactly one matching fulfillment-contract `Fulfilled` event;
- canonical payment-delivery ID;
- buyer recipient;
- exact token amount;
- transfer before the `Fulfilled` event;
- minimum confirmations;
- a second receipt read; and
- stable block number/hash and event bindings across revalidation.

Only after this contract/event truth is proven is it translated into the
existing economic confirmation journal as:

```text
fulfillment wallet -> buyer delivery address -> VOID units
```

The canonical confirmation journal therefore retains economic-delivery
semantics, while the payment-keyed terminal evidence separately retains the
actual EVM contract target and token/event proof.

## Reverted receipt

Status 0 uses a separate payment-keyed revert verifier.

It requires:

- exact transaction visibility first;
- exact receipt transaction hash;
- fulfillment-wallet sender;
- fulfillment-contract destination;
- status 0;
- nonzero block number;
- valid block hash;
- minimum confirmations; and
- a second identical receipt snapshot.

The canonical pipeline then records the existing definitive post-broadcast
revert state. The saga appends `receipt_reverted` and becomes terminal.

No automatic retry occurs in this lane.

## Immutable terminal receipt evidence

Before any canonical projection, the verifier result is written to:

```text
buy-void-payment-keyed-receipt-evidence-v1/attempts/<attempt_id>.json
```

The record is:

- append-once;
- private `0700` directory / `0600` file;
- content-fingerprinted;
- bound to saga, attempt, transaction, receipt policy, wallet, contract, buyer,
  amount, block, and confirmations; and
- terminal: confirmed and reverted evidence cannot replace one another.

Successful evidence additionally binds the payment identity/key-derived delivery
ID, reviewed VOID token, token amount, fulfillment log index, and transfer log
index.

Raw receipt logs and raw signed transaction bytes are not persisted.

## Crash-safe ordering

The apply ordering is:

```text
terminal receipt truth
  -> immutable payment-keyed receipt evidence
  -> canonical broadcast-accepted projection if missing
  -> saga broadcast_accepted if missing
  -> canonical confirmed/reverted projection
  -> saga receipt_confirmed/receipt_reverted
```

The focused proof injects crashes:

1. after receipt evidence but before broadcast projection;
2. after broadcast projection but before saga accepted;
3. after saga accepted but before terminal projection; and
4. after terminal projection but before the saga receipt event.

Every restart after terminal evidence performs **zero receipt RPC**. Recovery
uses the immutable evidence to repair only the missing local projections.

## Confirmed boundary

After `receipt_confirmed`:

- canonical execution state is confirmed;
- canonical broadcast outcome is confirmed;
- saga state is `receipt_confirmed`; and
- `ready_for_terminal_closeout=true`.

Inventory decrement and public fulfilled closeout are still false here.

## Revert boundary

After `receipt_reverted`:

- canonical broadcast outcome is reverted;
- execution attempt has definitive post-broadcast failure;
- saga state is terminal `receipt_reverted`; and
- terminal closeout is not allowed.

## Explicit non-authority

This lane performs no:

- credential access;
- wallet access;
- signing;
- submission-guard mutation;
- transaction broadcast;
- automatic retry;
- inventory decrement;
- public request fulfilled mutation;
- runtime mount;
- deployment;
- service action; or
- funds movement.

The next gate after a confirmed receipt is the existing terminal closeout
composition, adapted so payment-keyed receipt evidence is a required prerequisite
before inventory/public fulfilled mutation.
