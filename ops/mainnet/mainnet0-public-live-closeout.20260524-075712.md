# VOID Mainnet-0 Public Live Closeout

status: public_mainnet0_live_cross_box_green
created_at_utc: 20260524-075712
operator_label: zoso

public_live_checkpoint: 7e9d26b7 / ckpt-mainnet0-public-live-status-green-20260524-074155
final_local_proof_stack_log: /tmp/void-public-live-final-proof-stack-20260524-075712.log
alienware_public_live_status_smoke_log: /tmp/void-alienware-public-live-status-smoke-20260524-075530.log
cross_box_public_live_status_smoke_log: /tmp/void-crossbox-public-live-status-smoke-20260524-075623.log

launch_state: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
launch_approval: true
mutation_allowed: true
mutation_allowed_scope: launch_state_public_surface_status_only

precision_ready: true
precision_ready_head: 1687034
precision_gap: 0
precision_txroot_live: 1

alienware_ready: true
alienware_ready_head: 1686859
alienware_gap: 0
alienware_txroot_live: 1

## Completed launch work

Mainnet-0 launch approval artifact is committed and proved.
OpsTreasury seed is live, recorded, and balance-delta verified.
Active current docs and active proof scripts are promoted from NO-GO to public Mainnet-0 live.
Precision final local proof stack passed after commit.
Alienware is synced to the public-live checkpoint.
Alienware status smoke passed.
Precision cross-box status smoke passed.
Repo was clean after final proof stack.

## Live funding closeout

ops_treasury_seed_tx: 0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2
ops_treasury_seed_amount_void: 1000000
void_treasury_post_seed_balance_void: 332207333
ops_treasury_post_seed_balance_void: 1000000

## Guardrails that remain active

Public active validator admission remains disabled.
Public validator registration remains candidate/waiting only.
The next guarded operator selector remains vault126 / epoch128 / expectedValidatorCount=127.
Vault126 onboarding has not been executed.
Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
No additional treasury spend is authorized by this closeout.
No additional authority transfer is authorized by this closeout.
No private keys, seed phrases, wallet secrets, or credential material are included.

## Public release next steps

Prepare launch notes.
Prepare node-running instructions.
Prepare participant onboarding instructions.
Prepare public safety notes for validators, Buy VOID, wallet backup, and candidate/waiting registration.
Keep advanced/operator controls hidden from normal participant flows.
