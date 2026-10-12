# DataNet WC Evidence Packet Ledger Append Scratch Apply Receipt Closeout Review Index Hold v1

Marker: `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_HOLD_V1`

This lane creates a deterministic scratch apply receipt closeout review index for operator review. It consumes a sealed `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1` closeout record and emits a compact index over the scratch ledger preview chain.

This is a scratch apply receipt closeout review index only. It is intentionally not a canonical ledger append lane.

The review index binds:

- scratch apply receipt closeout id
- scratch apply receipt id
- scratch apply id
- scratch output ledger hash
- appended candidate line hash
- logical candidate next-ledger hash
- source evidence packet / review / award / ledger-write packet / dry-run / execute-packet chain
- indexer and reason

Boundary:

- review index only
- scratch closeout source only
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

Work Credits remain unlimited/uncapped accounting units for useful verifiable work. This review index references one finite approved amount for one reviewed fixture chain only; it is not a supply cap.

Example:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index.mjs \
  --closeout /tmp/scratch-apply-receipt-closeout.json \
  --out /tmp/scratch-apply-receipt-closeout-review-index.json \
  --indexer operator-review-indexer \
  --reason "fixture index binds scratch closeout only"
```
