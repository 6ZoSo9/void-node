# DataNet WC evidence packet ledger append scratch preview operator decision record candidate dry-run hold v1

This hold adds a read-only operator decision record candidate dry-run for the DataNet WC evidence packet ledger append scratch preview operator review chain.

The candidate dry-run consumes the operator decision draft packet, verifies the expected source marker, binds the source hash and draft hash, and emits a deterministic candidate decision record artifact for human inspection.

## Why this lane

This is the first lane after the draft packet that approaches an operator decision record shape. It stays deliberately dry-run-only so the system can review the candidate decision structure without creating, signing, approving, finalizing, or executing an operator decision.

## Source marker

`VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_DRAFT_PACKET_HOLD_V1`

## Candidate dry-run marker

`VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_HOLD_V1`

## Allowed candidate outcomes

- `request_changes`
- `reject_chain`
- `prepare_manual_operator_decision_record`

## Boundary

This is a public-safe review artifact and dry-run only.

It does not create or authorize an operator decision, operator signature, approval execution, canonical ledger append, WC issuance, WC claim, wallet transfer, signer access, validator admission, automatic execution, or live ledger mutation.

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

## Proof

Run:

```bash
bash ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-hold-v1-proof.sh
```

Expected result marker:

`VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_HOLD_V1_GREEN`
