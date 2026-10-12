# Buy VOID payment-keyed preparation custody v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1`

Status: source-only crash-recovery prerequisite. No runtime route or broadcast
authority is added.

## Problem

The merged payment-keyed signer produces a fully validated raw type-2
transaction in memory and deliberately does not persist it. That is correct for
the ordinary signing boundary, but crash-consistent execution needs a durable
prepared state before the saga can safely publish its write-ahead broadcast
intent.

Re-running the Chain-2050 planner after a crash is not sufficient because
pending nonce and fee observations can change. Persisting the raw signed
transaction in the ordinary application tree would instead create a reusable
fund-moving bearer artifact.

## Exact-request custody

This lane persists the exact nonsecret payment-keyed custodian request. That
request already binds:

- saga ID;
- execution-attempt ID;
- inventory/plan reservation ID;
- canonical payment identity and payment key;
- fulfillment contract;
- buyer delivery address and VOID amount;
- exact `fulfill(bytes32,address,uint256)` calldata and SHA-256;
- nonce, gas limit and fee envelope;
- fulfillment-call fingerprint;
- transaction-plan fingerprint;
- canonical unsigned-transaction fingerprint;
- request fingerprint; and
- request idempotency key.

No later pending-nonce or fee observation is allowed to replace these values
during recovery.

## Deterministic signing contract

Before the first custody record is written, apply mode signs the exact request
twice through the merged payment-keyed signer and requires:

- the same signer address;
- the same transaction hash; and
- the same SHA-256 of the raw signed transaction bytes.

The existing production ethers `Wallet` signer is byte-deterministic for an
identical type-2 transaction and key.

If the two signatures differ, the preparation is held and no custody record is
accepted.

## Crash recovery

The durable record stores:

- the complete exact request;
- signer address;
- final signed transaction hash;
- SHA-256 of the raw signed transaction;
- a custody fingerprint over those bindings; and
- explicit false authority flags.

It does **not** store the raw signed transaction.

On retry, the stored exact request is re-signed. Recovery succeeds only if the
signer address, transaction hash, and raw-byte SHA-256 exactly match the durable
record.

This gives a later saga/broadcast composition enough authority to reconstruct
the identical in-memory signed transaction while still refusing raw signed
payload persistence.

## Filesystem boundary

Records are append-once JSON under:

`buy-void-payment-keyed-preparation-custody-v1/records/<attempt_id>.json`

Directories are required to be mode `0700`; records are required to be direct
mode-`0600` files. Publication uses atomic hard-link creation and fsync of the
parent directory.

## Fault proof

The focused proof covers interruption:

1. after the first signature and before the second;
2. after the second matching signature and before the durable record;
3. successful first persistence; and
4. deterministic recovery from the persisted exact request.

It also proves changed-request reuse for the same attempt is rejected before
another signature.

## Explicit non-authority

This lane does not:

- accept caller raw signed transaction input;
- persist or return raw signed transaction bytes;
- broadcast or claim the durable submission guard;
- wait for a receipt;
- mutate the execution-attempt journal;
- mutate the crash-consistent saga;
- mutate inventory;
- close a public Buy VOID request;
- mount a runtime route;
- deploy or restart services; or
- move funds.

The next gate is the payment-keyed crash-consistent preparation coordinator:
persist this custody record, project the economic delivery transaction hash into
the existing execution-attempt journal, and append the saga
`transaction_prepared` event before any possible broadcast.
