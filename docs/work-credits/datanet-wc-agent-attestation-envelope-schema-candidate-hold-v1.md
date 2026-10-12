# DataNet WC Agent Attestation Envelope Schema Candidate — Hold v1

Marker: VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1

## Source

Source main head: 633ed1fd
Source subject: feat: add DataNet WC agent identity attestation policy index closeout final seal
Policy final seal marker: VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1

## Purpose

This brick defines the first public-safe candidate shape for a DataNet Work Credits agent attestation envelope.

An attestation envelope records:

- actor identity envelope
- actor type
- submitted work artifact pointer
- evidence packet pointer
- replay/proof command pointer
- reviewer/operator decision pointer
- Work Credit award status
- preserved authority boundary

## Important boundary

This is a schema candidate only.

No identity registry write.
No attestation registry write.
No public mutation route.
No automatic Work Credit issuance.
No Work Credit ledger write.
No reviewer staking activation.
No VOID transfer.
No wallet path.
No signer path.

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.
