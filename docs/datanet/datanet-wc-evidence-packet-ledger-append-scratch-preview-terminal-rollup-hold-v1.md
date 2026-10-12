# DataNet WC Evidence Packet Ledger Append Scratch Preview Terminal Rollup Hold v1

Marker: `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1`

This lane emits a deterministic terminal rollup for the scratch ledger append preview review chain. It consumes the final seal index closeout record `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1` and binds the closed scratch preview path into one operator-review endpoint.

This is a scratch preview terminal rollup only. It is intentionally not a canonical ledger append lane.

The rollup binds:

- final seal index closeout id
- final seal index id
- review index closeout id
- review index id
- scratch apply receipt closeout id
- scratch apply receipt id
- scratch apply id
- scratch output ledger hash
- appended candidate line hash
- logical candidate next-ledger hash
- source execute packet, dry-run, and ledger-write packet ids
- source evidence hash, work id, and worker

Boundary:

- terminal rollup only
- final seal index closeout source only
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

Work Credits remain unlimited/uncapped accounting units for useful verifiable work. This terminal rollup references one finite approved amount for one reviewed fixture chain only; it is not a supply cap.

Example:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup.mjs \
  --final-seal-index-closeout /tmp/scratch-final-seal-index-closeout.json \
  --out /tmp/scratch-preview-terminal-rollup.json \
  --operator operator-terminal-rollup \
  --reason "fixture terminal rollup binds closed scratch preview chain only"
```
