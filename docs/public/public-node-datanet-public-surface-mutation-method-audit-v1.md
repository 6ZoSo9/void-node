# DataNet Public Surface Mutation Method Audit v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_DOC_V1 -->

This document defines the Mainnet-0 public DataNet surface mutation method audit.

The audit checks public DataNet routes for read-only behavior.

## Scope

This is a public route HTTP method audit.

It does not execute public-submitted commands.

It does not mutate state.

It does not write the ledger.

It does not award Work Credits.

## Expected behavior

- `GET` should return HTTP 2xx for audited public DataNet routes.
- `POST` should return HTTP 400+.
- `PUT` should return HTTP 400+.
- `PATCH` should return HTTP 400+.
- `DELETE` should return HTTP 400+.

## Public DataNet routes under audit

- `/public-node/datanet/challenge/demo003-folder-fixture-v1`
- `/public-node/datanet/challenge-tester-copy-pack-v1.json`
- `/public-node/datanet/challenge-offline-verify-pack-v1.json`
- `/public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json`
- `/public-node/datanet/challenge-operator-review-record-fixture-v1.json`
- `/public-node/datanet/challenge-wc-candidate-fixture-v1.json`
- `/public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json`
- `/public-node/datanet/challenge-award-intent-packet-fixture-v1.json`
- `/public-node/datanet/data-plane-settlement-plane-boundary-v1.json`
- `/public-node/datanet/local-storage-path-isolation-boundary-v1.json`
- `/public-node/datanet/public-surface-path-leak-audit-v1.json`
- `/public-node/datanet/public-surface-mutation-method-audit-v1.json`

## Expected proof marker

`VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_PROOF_V1_GREEN`

PROTECT THE CORE.
