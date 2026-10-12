# Authenticated paid-work production activation source commit graph v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_SOURCE_COMMIT_GRAPH_V1`

## Purpose

The activation execution packet contains exact Git commit SHAs for one reviewed
`main` baseline and twelve semantic source prerequisites. String equality alone
cannot prove that those objects exist in this repository or that the reviewed
baseline actually contains them.

This guard makes the packet's source graph fail closed before any later runtime
or credential work begins.

## Required graph

The focused proof requires:

- a non-shallow checkout;
- `reviewed_source_main` to resolve to a commit object;
- `reviewed_source_main` to be an ancestor of the checked-out pull-request
  revision;
- every `required_source_commits` value to resolve to a commit object;
- every semantic prerequisite to be an ancestor of `reviewed_source_main`;
- the credential-metadata prerequisite to remain distinct from, and earlier
  than or equal by ancestry to, the reviewed baseline; and
- all packet authority fields to remain false.

The proof uses `git` through argument-array process execution. It does not invoke
a shell, fetch from the network, mutate refs, write repository objects, or use
credentials.

## Why full history is required

A default shallow checkout can contain the current revision while omitting older
semantic prerequisite objects. That would make a graph check ambiguous or allow
it to be silently skipped. The focused workflow therefore uses
`fetch-depth: 0` and the packet explicitly forbids shallow-history proof.

## Evidence boundary

This guard proves repository-object existence and ancestry only. It does not
prove that a runtime host has deployed the reviewed tree, that private evidence
is authentic, that a credential is currently valid or unrevoked, or that a
quote, signature, confirmation, execution plan, payment, work dispatch, or Work
Credit mutation exists.

The execution packet remains `SOURCE_READY_EXECUTION_NOT_AUTHORIZED` and
readiness remains `HOLD`.

## Verification

```bash
node --check \
  scripts/prove_authenticated_paid_work_production_activation_source_commit_graph_v1.mjs

node \
  scripts/prove_authenticated_paid_work_production_activation_source_commit_graph_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_SOURCE_COMMIT_GRAPH_V1_PROOF_GREEN=true
```

## Authority boundary

This lane does not access credentials, private keys, wallets, signers, or private
runtime evidence. It does not deploy, restart a service, activate paid work,
accept or execute payment, dispatch work, write Work Credits, construct or
broadcast a transaction, settle VOID, or move funds.
