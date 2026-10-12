# VOID Release Qualification Operator Runbook v1

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1`

## Sequence

1. Publish and verify an immutable release using the protected publication workflow.
2. Promote that release to the candidate channel.
3. Generate a qualification plan from the publication packet, publication receipt, and canary receipt.
4. Run every required target on an isolated host or runner.
5. Record one result per target with immutable evidence hashes.
6. Evaluate the matrix into a qualification receipt.
7. Have a distinct reviewer approve the receipt.
8. Publish the qualification state through an exact-head pull request.
9. Promote to stable only with the qualification receipt and approval.

## Prepare

```bash
node tools/void-release-qualification-v1.mjs prepare \
  --packet publication-packet-v1.json \
  --publication-receipt publication-receipt-v1.json \
  --canary-receipt canary-receipt-v1.json \
  --out qualification-plan-v1.json
```

## Evaluate and approve

```bash
node tools/void-release-qualification-v1.mjs evaluate \
  --plan qualification-plan-v1.json \
  --result-dir qualification-results \
  --out qualification-receipt-v1.json

node tools/void-release-qualification-v1.mjs approve \
  --receipt qualification-receipt-v1.json \
  --reviewer-id REVIEWER_ID \
  --confirm "APPROVE RELEASE QUALIFICATION release-vX.Y.Z" \
  --out qualification-approval-v1.json
```

## Stable promotion

```bash
node tools/void-release-promotion-v1.mjs stable \
  --state-dir release/promotion/state \
  --packet publication-packet-v1.json \
  --publication-receipt publication-receipt-v1.json \
  --canary-receipt canary-receipt-v1.json \
  --qualification-receipt qualification-receipt-v1.json \
  --qualification-approval qualification-approval-v1.json \
  --confirm "PROMOTE release-vX.Y.Z TO STABLE"
```

Do not reuse a runner identity as the reviewer identity. Do not hand-edit
qualification receipts, approvals, promotion ledgers, or derived channel state.
