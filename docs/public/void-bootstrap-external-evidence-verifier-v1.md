# VOID bootstrap external evidence verifier v1

## Purpose

Issue #1005 requires real outside-machine N-1 bootstrap evidence before plug-and-play public onboarding can be accepted. The existing `void_bootstrap_external_acceptance_receipt_v1` contract deliberately rejects `external_machine_observation` unless a separately reviewed verifier is injected.

This module supplies the source-side verifier boundary. It does **not** collect external evidence and does not claim that a machine is physically independent merely because an input says so.

## Evidence bundle

The verifier consumes exactly seven sanitized observation envelopes matching the seven SHA-256 evidence fields already bound by the acceptance receipt:

1. eligible paths before first synchronization;
2. first-node readiness after sync;
3. first-node verified peers after sync;
4. first-node readiness after first-contact removal;
5. first-node verified peers after removal;
6. second-node readiness while a different component is unavailable; and
7. second-node verified peers.

Each envelope binds:

- exact observation kind;
- sanitized machine label;
- canonical UTC observation timestamp;
- normalized payload;
- collector ID;
- capture ID;
- source kind `external_machine_capture_v1`; and
- SHA-256 of the underlying source capture.

The canonical JSON SHA-256 of the entire envelope must exactly equal the corresponding hash stored in the acceptance receipt.

## Semantic reproduction

Hash equality is necessary but not sufficient. The verifier also reproduces the receipt claims from the observation payloads:

- eligible path set;
- selected first and second paths;
- authenticated first-contact peer IDs;
- nonzero head, `gap=0`, and `txroot_live=1` readiness;
- learned verified peer sets;
- exact first-contact removal tuple;
- continued verified-peer connectivity after removal; and
- exact second-node intentionally unavailable component tuple.

The post-removal head may advance. It is required to remain nonzero and green; it is not required to equal the earlier head.

Observations dated after the receipt's `observed_at` fail closed.

## External provenance boundary

Source code cannot prove by self-assertion that a capture came from a genuinely independent outside machine or failure domain.

`createVoidBootstrapExternalEvidenceVerifierV1` therefore requires an injected `verifyCaptureProvenance(observation, receipt)` function. Every one of the seven captures must independently return exact boolean `true`. Missing, throwing, or rejecting provenance verification fails closed.

A later live collector/provenance implementation must be reviewed separately. It may validate machine identity, capture origin, network independence, signed operator/tester evidence, or another accepted provenance mechanism. This verifier does not choose that trust authority.

## Authority boundary

This lane is source/proof/documentation/CI only. It performs no:

- network collection;
- HTTP/Tor/DNS/bootstrap activation;
- outside-machine action;
- service start/restart/deployment;
- firewall/router/interface mutation;
- credential/private-key access;
- wallet/signer/validator/treasury/Work Credit action;
- transaction/broadcast; or
- money movement.

Passing the synthetic proof does not close #1005 and does not constitute external acceptance.
