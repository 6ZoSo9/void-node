# DataNet WC Evidence Packet Verifier — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1

## Purpose

This adds a local verifier for DataNet WC evidence packets produced by the generator.

Usage:

```bash
node tools/datanet-wc-evidence-packet-verify.mjs \
  --packet <packet.json> \
  --input <directory> \
  --expect-work-id <id> \
  --expect-worker <handle>
```

The verifier recomputes the file manifest and evidence hash from the local input directory, checks the packet boundary fields, and returns a verification result.

## Boundary

This is local verification only.

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
