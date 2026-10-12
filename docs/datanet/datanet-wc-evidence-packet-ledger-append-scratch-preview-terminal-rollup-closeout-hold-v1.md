# DataNet WC Evidence Packet Ledger Append Scratch Preview Terminal Rollup Closeout Hold v1

Marker: `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1`

This lane emits a deterministic closeout record for the scratch preview terminal rollup `VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1`.

This is a scratch preview terminal rollup closeout only. It is intentionally not a canonical ledger append lane.

The closeout binds:

- scratch preview terminal rollup id
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

- terminal rollup closeout only
- terminal rollup source only
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

Work Credits remain unlimited/uncapped accounting units for useful verifiable work. This closeout references one finite approved amount for one reviewed fixture chain only; it is not a supply cap.

Example:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-closeout.mjs \
  --terminal-rollup /tmp/scratch-preview-terminal-rollup.json \
  --out /tmp/scratch-preview-terminal-rollup-closeout.json \
  --closer operator-terminal-rollup-closeout \
  --reason "fixture closeout binds scratch preview terminal rollup only"
```
