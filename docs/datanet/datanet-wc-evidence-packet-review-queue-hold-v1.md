# DataNet WC Evidence Packet Review Queue — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1

## Purpose

This adds a local review queue tool for DataNet WC evidence packet roundtrip summaries.

Usage:

```bash
node tools/datanet-wc-evidence-packet-review-queue.mjs \
  --summary <roundtrip-summary.json> \
  --queue-dir <directory> \
  --reviewer <handle>
```

The tool validates a roundtrip summary, derives a deterministic review ID, and writes a pending operator-review queue entry.

## Boundary

This is local review queue creation only.

No review decision.
No Work Credit award approval.
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
