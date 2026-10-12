# DataNet WC evidence packet ledger append scratch preview operator decision record candidate dry-run chain status rollup hold v1

This hold adds a read-only chain status rollup for the DataNet WC evidence packet ledger append scratch preview operator decision record candidate dry-run stack.

The rollup consumes the operator decision record candidate dry-run closeout final seal index closeout JSON, verifies the expected source marker, binds the source hash, final seal index closeout hash, final seal index hash, dry-run closeout hash, candidate dry-run hash, draft packet hash, readiness packet hash, and operator handoff chain status rollup hash, and emits a deterministic rollup JSON for manual operator review.

## Why this lane

This is a deliberate consolidation point after the operator decision record candidate dry-run, closeout, final seal index, and final seal index closeout sequence. It summarizes the dry-run decision candidate chain state before any future live operator decision record lane.

## Source marker

`VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1`

## Rollup marker

`VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_HOLD_V1`

## Boundary

This is a public-safe review artifact and dry-run chain status rollup only.

It does not create or authorize an operator decision, operator signature, approval execution, canonical ledger append, WC issuance, WC claim, wallet transfer, signer access, validator admission, automatic execution, or live ledger mutation.

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

## Proof

Run:

```bash
bash ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-hold-v1-proof.sh
```

Expected result marker:

`VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_HOLD_V1_GREEN`
