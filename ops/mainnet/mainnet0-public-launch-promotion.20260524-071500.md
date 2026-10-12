# VOID Mainnet-0 Public Launch Promotion

status: public_launch_promotion_ready
created_at_utc: 20260524-071500

launch_approval_artifact: ops/mainnet/mainnet0-launch-approval-artifact.20260524-071550.md
launch_approval_checkpoint: ffe62f39 / ckpt-mainnet0-launch-approval-green-20260524-071550

ops_treasury_seed_artifact: ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md
ops_treasury_seed_checkpoint: c79cde2b / ckpt-ops-treasury-seed-live-green-20260524-115943
post_ops_seed_closeout_checkpoint: c36f5b80 / ckpt-post-ops-seed-launch-state-green-20260524-070500

requested_launch_state: public_mainnet0_live
launch_approval: true
mutation_allowed: true
mutation_allowed_scope: launch_state_public_surface_status_only

## Proven prerequisites

Mainnet-0 launch approval artifact is committed and tagged.
OpsTreasury has been seeded with 1,000,000 VOID.
OpsTreasury seed tx is recorded and balance-delta verified.
Precision and Alienware are synced and cross-box green after the live seed.
Public release/status smoke remains green.
Node readiness remains ready=true gap=0 txroot_live=1.

## Still guarded after promotion

Public active validator admission remains disabled.
Public validator registration remains candidate/waiting only.
The next guarded operator selector remains vault126 / epoch128 / expectedValidatorCount=127.
Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
No additional treasury spend is authorized by this promotion.
No additional authority transfer is authorized by this promotion.

## Operator statement

Promote VOID Mainnet-0 from not_go_for_public_mainnet0 to public_mainnet0_live.

This promotion is a public launch-state/status promotion only.
It does not admit public active validators.
It does not execute vault126 onboarding.
It does not spend additional treasury funds.
It does not send additional VOID.
