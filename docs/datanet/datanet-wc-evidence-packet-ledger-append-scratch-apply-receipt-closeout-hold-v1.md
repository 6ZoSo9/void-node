# DataNet WC Evidence Packet Ledger Append Scratch Apply Receipt Closeout Hold v1

Marker: `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1`

This lane closes out the scratch apply receipt path for operator review. It consumes a deterministic `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1` receipt and emits a final closeout record that summarizes the scratch ledger preview, the appended candidate line hash, the scratch output ledger hash, and the upstream evidence/review/award/dry-run/execute-packet chain.

This is a scratch apply receipt closeout only. It is intentionally not a canonical ledger append lane.

The closeout binds:

- scratch apply receipt id
- scratch apply id
- scratch output ledger hash
- appended candidate line hash
- logical candidate next-ledger hash
- source evidence packet / review / award / ledger-write packet / dry-run / execute-packet chain
- closer and reason

Boundary:

- scratch receipt closeout only
- scratch output ledger preview binding only
- no canonical ledger append
- no WC issuance
- no WC claim
- no actual WC ledger write
- no VOID or USDC transfer
- no wallet connection
- no signer access
- no network submit
- no public mutation

Work Credits remain unlimited/uncapped accounting units for useful verifiable work. This closeout records one finite approved amount for one reviewed fixture chain only; it is not a supply cap.

Example:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout.mjs \
  --receipt /tmp/scratch-apply-receipt.json \
  --out /tmp/scratch-apply-receipt-closeout.json \
  --closer operator-closeout-reviewer \
  --reason "fixture closeout binds scratch receipt only"
```
