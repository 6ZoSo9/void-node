# DataNet WC Evidence Packet Roundtrip — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1

## Purpose

This adds a local one-command roundtrip for DataNet WC evidence packets:

1. generate a deterministic evidence packet from a local directory
2. verify the generated packet against that same local directory
3. emit a roundtrip summary for operator/reviewer handoff

Usage:

```bash
node tools/datanet-wc-evidence-packet-roundtrip.mjs \
  --input <directory> \
  --packet-out <packet.json> \
  --work-id <id> \
  --worker <handle> \
  --verify-out <verify.json> \
  --summary-out <summary.json>
```

## Boundary

This is local roundtrip generation and verification only.

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
