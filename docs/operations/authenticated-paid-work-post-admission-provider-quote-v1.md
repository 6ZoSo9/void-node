# Authenticated Paid-Work Post-Admission Provider Quote V1

## Purpose

This lane closes the timing gap between an authenticated submission being
accepted for review and its first private provider quote being materialized.

The operator command starts from:

- the full `VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1`;
- the exact prepared submission request whose raw and canonical hashes are
  bound into that receipt;
- the existing signed VOID node-to-onion binding;
- an explicit local operator identity and exact confirmation.

It does **not** submit another request. The accepted intake receipt must already
exist.

## Bounded closeout

The command composes the merged canonical contracts in this order:

1. enqueue the accepted receipt in the private review queue;
2. create an explicit `approved_for_provider_selection` operator decision
   with the fixed `operator_approved` reason code;
3. verify the existing signed node binding and loopback `/health.nodeId`;
4. materialize a review-scoped provider-authentication packet;
5. materialize a one-provider registry snapshot;
6. execute deterministic provider selection;
7. materialize one private quote for exactly `0.01 USD`;
8. write one append-once closeout receipt.

The work order is revalidated through the canonical work-order verifier and
must retain at least 600 seconds at every major stage. The admission callback,
input/output counts, TTL, limits, asset, and budget must match the exact bound
work order. This prevents a delayed or mismatched operator workflow from
producing a quote against an expired or different work order.

Existing queue, review, and provider-selection responses are never trusted by
marker alone. The canonical append-once command is invoked again through a
private temporary response, forcing its duplicate/index verification, and the
result must match the stored response except for duplicate-recovery metadata.

V1 fixes the logical provider mapping to
`void.provider.datanet.verify.precision`.

## Authority boundary

The closeout can write only private queue, review, provider-authentication,
registry, selection, quote, index, response, and closeout artifacts. Every
configured state root must resolve below `~/.local/state`; broader or escaping
paths fail closed.

It cannot:

- send the authenticated submission POST;
- publish the quote;
- create requester acceptance;
- resolve or execute payment;
- authorize or dispatch paid work;
- award or write Work Credit;
- settle VOID;
- access a wallet, signer, credential, or private key;
- sign or broadcast a transaction;
- restart or deploy a service;
- mutate Git.

The existing signed node binding is verified. No new key or signature is
created.

The focused proof also runs a temporary canonical-contract integration chain
for work-order materialization, review queueing, operator approval, provider
registry/selection, and quote materialization. CI installs the repository Node
dependencies and reruns this integration whenever this lane or any pinned
dependency changes.

## Validation

```bash
python3 -B \
  ops/close_authenticated_paid_work_post_admission_provider_quote_v1.py \
  self-test

python3 -B \
  scripts/prove_authenticated_paid_work_post_admission_provider_quote_v1.py
```

A live closeout requires the exact confirmation:

```text
closeVoidAuthenticatedPaidWorkPostAdmissionProviderQuoteV1
```

The `validate` mode checks repository provenance, receipt/request hashes,
work-order freshness, signed binding, and loopback node identity without
writing closeout state.

## Canonical runtime compatibility

The signed node binding is a canonical nested signed envelope. The closeout
does not walk arbitrary JSON looking for identity fields. It invokes the pinned
`void-node-onion-binding-v1.mjs` verifier without caller-supplied identity
expectations, accepts exactly one authenticated `node_id`, `onion_uri`, and
`expires_at` summary, validates their canonical forms, and invokes the verifier
again with the discovered node ID and onion hostname as exact expectations.
The verified node ID must also match the loopback `/health.nodeId`.

Private state directories are confined below `~/.local/state`, forced to mode
`0700`, and checked with `stat.S_ISDIR(metadata.st_mode)` on the `lstat`
result. A Python `os.stat_result` is never treated as a `Path`.

The closeout result and provider-quote response deliberately use distinct
authority schemas. The closeout result uses
`payment_authorization_granted` and
`work_execution_authorization_granted`; the quote response uses
`payment_authorized` and `work_execution_authorized`. Proofs pin both exact
key sets and reject aliases crossing between them.
