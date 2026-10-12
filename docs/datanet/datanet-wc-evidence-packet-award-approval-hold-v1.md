# DataNet WC Evidence Packet Award Approval — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1

## Purpose

This adds a local award approval record tool for DataNet WC evidence award proposals.

Usage:

```bash
node tools/datanet-wc-evidence-packet-award-approval.mjs \
  --proposal <proposal.json> \
  --out <approval.json> \
  --approver <handle> \
  --decision approve_award \
  --reason "why this award proposal is approved"
```

Allowed approval decisions:

- `approve_award`
- `request_changes`
- `reject_award`

An approved record carries the finite approved WC amount for this reviewed evidence packet.

## Boundary

This is local award approval record creation only.

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
