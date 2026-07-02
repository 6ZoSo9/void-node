# DataNet WC Evidence Packet Award Proposal — Hold v1

Marker: VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1

## Purpose

This adds a local award proposal record tool for accepted DataNet WC evidence review decisions.

Usage:

```bash
node tools/datanet-wc-evidence-packet-award-proposal.mjs \
  --decision <decision.json> \
  --out <proposal.json> \
  --proposer <handle> \
  --proposed-wc <positive integer> \
  --reason "why this amount is suggested"
```

The tool only accepts review decisions with `accept_evidence`.

## Boundary

This is local award proposal record creation only.

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
