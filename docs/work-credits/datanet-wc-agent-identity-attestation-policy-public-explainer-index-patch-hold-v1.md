# DataNet WC Agent Identity + Attestation Policy Index Patch — Hold v1

Marker: VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_HOLD_V1

## Source

Source marker: VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_HOLD_V1

This patch makes the public DataNet Work Credits agent identity and attestation policy explainer discoverable from the public Work Credits index.

## Purpose

The prior explainer answers how DataNet thinks about:

- agent identity envelopes
- attestations as receipts
- artifact chains
- reviewer/operator decision pointers
- Work Credit award boundaries

This index patch adds public discovery metadata only.

## Boundary

Public-safe and read-only.

No identity registry write.
No public mutation route.
No automatic Work Credit issuance.
No Work Credit ledger write.
No reviewer staking activation.
No VOID transfer.
No wallet path.
No signer path.
