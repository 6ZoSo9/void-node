# DataNet WC Evidence Packet Review Decision — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1

## Purpose

This adds a local review decision record tool for queued DataNet WC evidence packet reviews.

Usage:

```bash
node tools/datanet-wc-evidence-packet-review-decision.mjs \
  --queue-entry <queue-entry.json> \
  --out <decision.json> \
  --reviewer <handle> \
  --decision accept_evidence \
  --reason "evidence looks complete"
```

Allowed decisions:

- `accept_evidence`
- `request_changes`
- `reject_evidence`

## Boundary

This is local review decision record creation only.

No Work Credit award amount.
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
