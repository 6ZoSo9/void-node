# DataNet WC Evidence Packet Ledger Append Dry Run — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1

## Purpose

This adds a local ledger append dry-run tool for approved DataNet WC evidence ledger-write packets.

Usage:

```bash
node tools/datanet-wc-evidence-packet-ledger-append-dry-run.mjs \
  --packet <ledger-write-packet.json> \
  --out <dry-run.json> \
  --operator <handle> \
  --ledger-current-hash <64hex> \
  --reason "dry-run before separate operator append"
```

The tool validates the ledger-write packet and computes a candidate ledger line hash plus a candidate next ledger hash.

## Boundary

This is local ledger append dry-run only.

No ledger append is performed.
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
