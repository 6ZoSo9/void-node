# DataNet WC Evidence Packet Generator — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1

## Purpose

This adds an actual local tool for contributors/operators:

```bash
node tools/datanet-wc-evidence-packet.mjs \
  --input <directory> \
  --out <packet.json> \
  --work-id <id> \
  --worker <handle>
```

The tool walks an input directory, hashes each file, creates a deterministic evidence hash, and emits a reviewer-ready JSON evidence packet.

## Boundary

This is packet generation only.

No Work Credit issuance.
No Work Credit claim.
No Work Credit ledger write.
No VOID transfer.
No USDC transfer.
No wallet connection.
No signer access.
No network submit.
No public mutation.

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.
