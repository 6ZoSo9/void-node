# DataNet Public Surface Path Leak Audit v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_DOC_V1 -->

This document defines the Mainnet-0 public DataNet surface path leak audit.

The audit checks public DataNet routes for concrete private path leaks, command hook leaks, key material leaks, token-like leaks, and unsafe mutation/accounting claims.

## Scope

This is a public route response audit.

It does not scan operator-local filesystem contents.

It does not execute public-submitted commands.

It does not mutate state.

It does not write the ledger.

It does not award Work Credits.

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

## Expected proof marker

`VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_PROOF_V1_GREEN`

PROTECT THE CORE.
