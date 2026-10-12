# DataNet WC Evidence Packet Ledger Append Scratch Apply — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1

## Purpose

This adds a local scratch-ledger apply preview for a DataNet WC evidence ledger append execute packet.

Usage:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply.mjs \
  --execute-packet <execute-packet.json> \
  --ledger-in <scratch-ledger.jsonl> \
  --ledger-out <scratch-ledger-out.jsonl> \
  --operator <handle> \
  --confirm I_UNDERSTAND_THIS_WRITES_ONLY_A_SCRATCH_LEDGER_PREVIEW \
  --reason "scratch preview before canonical operator append"
```

The tool validates the execute packet, checks the scratch ledger's current hash, writes the candidate line to a separate scratch output ledger, and reports the scratch output hash.

## Boundary

This is scratch preview only.

No canonical ledger append is performed.
No Work Credit issuance.
No Work Credit claim.
No actual Work Credit ledger write.
No VOID transfer.
No USDC transfer.
No wallet connection.
No signer access.
No network submit.
No public mutation.

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.
