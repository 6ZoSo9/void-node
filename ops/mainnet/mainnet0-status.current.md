# VOID Mainnet-0 Current Status

status: public_mainnet0_live
updated_at: 2026-05-24
operator_label: zoso

## Green / ready signals

- Precision node readiness is green.
- Alienware node readiness is green.
- Update safety gate is green.
- Validator lifecycle composite gate is green.
- Operator/bootstrap validator runtime truth is green through epoch127.
- vault123 and vault125 operator/bootstrap live admissions completed successfully.
- Epoch127 reports validatorCount=126, totalPower=126000000000000000000000, published=true, and publishedMatch=true.
- Durable local RPC restore/recovery lane is green through epoch127.
- Mainnet-0 status smoke is green after epoch127 runtime-truth recovery.
- Buy VOID Base create/watch path is green.
- Buy VOID payment safety copy is live.
- Buy VOID watcher config uses Base native USDC.
- Operator checkpoint/finality policy review is recorded.
- Validator public reward address and consensus key are recorded.
- Validator runtime truth is recovered through epoch127; the current guarded next-onboard lane now points to vault126 / epoch128 / expectedValidatorCount=127.
- Validator next-onboard intent gate proof is green cross-box: confirm:true, exact operator intent, and VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1 are required before live onboarding can run.
- Launch approval is committed and cross-box proven at 4c3aa800 / ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500.
- Public launch state is promoted to public_mainnet0_live.
- OpsTreasury seed is live and cross-box proven: 1,000,000 VOID moved from VoidTreasury to OpsTreasury in tx 0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2.
- WC devnet local-state runtime is cross-box proven at e0637a17 / ckpt-wc-devnet-local-state-runtime-green-20260523-081804; per-machine WC deploy addresses live under .runtime/mainnet0/wc-devnet-local/current and tracked WC state files stay clean.

## Still guarded after public launch promotion

- Public validator candidate promotion/admission remains blocked.
- Public candidate/waiting registration must not be confused with operator/bootstrap validator admission.
- Previous guarded operator vault125 live admission has executed and is reflected through epoch127; current next guarded operator lane is vault126 / epoch128 / expectedValidatorCount=127; public validator promotion/admission remains blocked.
- Next-onboard intent gate remains a safety gate for the next operator lane; it does not approve public validator promotion/admission.
- First real Buy VOID payment claim and fulfillment have completed successfully.
- A real Ethereum USDC payment hash has been verified for the first fulfilled Buy VOID lane.
- 2,500 VOID has been sent and recorded for the first fulfilled Buy VOID lane.
- Mainnet-0 public launch promotion is approved and recorded.
- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- The initial OpsTreasury seed is complete; any future treasury spend remains separately dry-run/proof/tx-ref gated.

## Current validator admission state

Two validator tracks must stay separate:

1. Operator/bootstrap validator runtime truth:
   - latestEpoch: 127
   - validatorCount: 126
   - active validator count on recovered 8545 state: 126
   - next operator candidate selector: vault126 targeting epoch128 / expectedValidatorCount=127
   - durable 8545 restore/recovery lane is green through epoch127.
   - vault125 admission required post-mutation recovery and is now reflected in verified runtime truth through epoch127.
   - public active validator admission remains disabled; launch-state promotion does not mutate public validator admission.

2. Public participant validator registration:
   - public registration/candidate/waiting status remains non-launching.
   - public registration does not mutate the active validator set.
   - candidate/waiting state is not active validator admission.
   - promotion remains plan-only and non-mutating until intentionally changed through a guarded proof lane.

Do not describe public validator registration as active until the live config, runtime endpoints, and cross-box checks all agree.

## Current Buy VOID state

Buy VOID has completed its first controlled real-money fulfillment test.

The completed first fulfillment used Ethereum mainnet USDC and recorded a real VOID fulfillment transaction reference.

Remaining Buy VOID work is product hardening, clearer dual-lane UX, and preserving the rule that payment confirmation and VOID fulfillment are separate operator-auditable transitions.

Do not accept blind direct deposits.
Do not accept exchange or custodial sends.
Do not run claim/fulfillment without a real supported-chain transaction hash.

## Operator rule

VOID Mainnet-0 is public_mainnet0_live after the explicit launch approval, OpsTreasury seed, promotion artifact, and cross-box proof.

This public launch state does not authorize public active validator admission, vault126 onboarding, blind Buy VOID fulfillment, or additional treasury spend.


## Buy VOID hard-stop gate

- Buy VOID hard-stop composite proof is wired into Mainnet-0 prelaunch safety.
- Buy VOID hard-stop proof target: make buy-void-hardstop-proof.
- Payment confirmation does not equal VOID sent.
- Fulfillment still requires an explicit operator VOID transaction reference.
- Real Buy VOID payment claim/send has completed once; future fulfillments remain blocked unless payment verification and explicit VOID tx-ref recording pass.

- Validator live-admission readiness proof is green.
