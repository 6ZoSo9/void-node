# DataNet WC Evidence Packet Ledger Append Scratch Apply Receipt Hold v1

Marker: `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1`

This lane records a deterministic receipt for a scratch-ledger apply preview. It consumes a `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1` scratch-apply record plus the separate scratch output ledger and verifies that the scratch ledger's final line is the candidate ledger line from the execute packet chain.

The receipt binds:

- scratch apply id
- scratch output ledger hash
- appended candidate line hash
- logical candidate next-ledger hash
- reviewer and reason
- upstream evidence packet / review / award / ledger-write packet / dry-run / execute-packet markers

Boundary:

- scratch receipt only
- scratch output ledger verification only
- no canonical ledger append
- no WC issuance
- no WC claim
- no actual WC ledger write
- no VOID or USDC transfer
- no wallet connection
- no signer access
- no network submit
- no public mutation

Work Credits remain unlimited/uncapped accounting units for useful verifiable work. This receipt records one finite approved amount for one reviewed fixture chain only; it is not a supply cap.

Example:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt.mjs \
  --scratch-apply /tmp/scratch-apply.json \
  --scratch-ledger /tmp/scratch-ledger-out.jsonl \
  --out /tmp/scratch-apply-receipt.json \
  --reviewer operator-receipt-reviewer \
  --reason "fixture receipt binds scratch ledger preview only"
```

Proof binding phrase: scratch apply receipt.
