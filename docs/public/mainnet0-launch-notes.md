# VOID Network Mainnet-0 Launch Notes

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
checkpoint: 6c8fa0df / ckpt-mainnet0-public-live-closeout-green-20260524-075712
operator_label: zoso

VOID Mainnet-0 is live.

This is the first public live checkpoint for the VOID Network. The launch-state/status surface is promoted to public_mainnet0_live and is cross-box proven on Precision and Alienware.

## What is live

- VOID node runtime is live.
- Precision and Alienware are cross-box proven.
- Mainnet-0 status is public_mainnet0_live / GO_PUBLIC_MAINNET0.
- TxRoot/live readiness is green.
- Public participant page is available from a running node.
- Buy VOID has a guarded operator-auditable fulfillment lane.
- Public validator registration is candidate/waiting only.
- Operator/bootstrap validator runtime truth is green through epoch127.

## What remains guarded

- Public active validator admission remains disabled.
- Public registration does not instantly make a validator active.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- No additional treasury spend is authorized by launch status.
- No additional authority transfer is authorized by launch status.
- Operator/admin controls are not public participant controls.

## Funding closeout

OpsTreasury was seeded with 1,000,000 VOID.

- tx: 0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2
- VoidTreasury post-seed balance: 332,207,333 VOID
- OpsTreasury post-seed balance: 1,000,000 VOID

Future treasury movements require a separate dry-run, signer check, transaction hash, and post-state proof.

## Participant warning

Do not send funds blindly.

Use only supported participant flows. Do not send from exchanges or custodial accounts when the page warns against it. Buy VOID fulfillment is not automatic just because payment is seen; it requires explicit verification and a recorded VOID transaction reference.
