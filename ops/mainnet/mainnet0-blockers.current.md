# VOID Mainnet-0 Guarded Post-Launch Boundaries

status: guarded_after_public_launch
launch_state: public_mainnet0_live
operator_label: zoso
updated_at: 2026-05-24

## Purpose

This file lists the guarded boundaries that remain after public Mainnet-0 launch promotion.

The initial OpsTreasury seed money step is complete; future money-moving steps remain separately guarded.

## Current known-good baseline

Current public-live-but-guarded posture:

- Precision node readiness is green.
- Alienware node readiness is green.
- Cross-box status smoke is green.
- Update safety is green on Precision.
- Validator lifecycle is green and fresh on Precision.
- Operator/bootstrap validator runtime truth is green through epoch127.
- vault123 and vault125 operator/bootstrap live admissions completed successfully.
- Epoch127 reports validatorCount=126, totalPower=126000000000000000000000, published=true, and publishedMatch=true.
- Durable 8545 restore/recovery lane is green through epoch127.
- Mainnet-0 status smoke is green after epoch127 runtime-truth recovery.
- Live-admission dry-run proof is dynamic and now points to vault126 / epoch128 while still blocking mutation without confirm:true.
- Buy VOID Base create/watch path is green.
- Buy VOID safety copy is live.
- Buy VOID watcher config is set on both boxes.
- Validator public keys are recorded.
- Validator policy review is recorded.
- Public launch promotion proof is green and cross-box proven.
- Launch approval prep refs are cross-box proven at 3a626ed5 / ckpt-launch-approval-prep-refs-current-green-20260523-100217.
- Public launch approval is committed and proved; OpsTreasury seed is live and balance-delta verified.
- Validator admission blocker proof is green and proves public registration is plan-only/waiting/not-active.
- Validator admission promotion plan proof is green and proves the future promotion path remains plan-only and non-mutating.
- Validator live-admission readiness must be refreshed against the current vault126 / epoch128 selector before any future operator mutation.
- Validator next-onboard intent gate proof is green and cross-box proven: missing/wrong operator intent fails before the live env switch, exact intent remains blocked while VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION is off.

## Guard 1: maintain status proof discipline

Required before every major launch-adjacent change:

- Run make mainnet0-status-proof on Precision.
- Run make mainnet0-crossbox-status-smoke from Precision.
- Keep status file at public_mainnet0_live only while launch approval, seed proof, and cross-box proofs remain green.

Definition of done:

- Precision full proof passes.
- Cross-box smoke passes.
- Public launch approval is recorded, while validator/spend guardrails remain explicit.

## Guard 2: public validator Mainnet-0 posture is candidate-only

Current validator state:

- Operator/bootstrap validator runtime truth is green through epoch127.
- vault123 and vault125 are admitted in the operator/bootstrap validator set.
- The next operator selector is vault126 targeting epoch128.
- Previous vault125 guarded operator live admission executed and epoch127 runtime truth is recovered; current next guarded operator lane is vault126 / epoch128 / expectedValidatorCount=127; future operator admission remains blocked until a new guarded proof.
- Next-onboard intent gate is green, but live admission remains blocked unless an explicit guarded live proof enables the env switch and supplies the exact operator intent.
- Public participant validator registration remains candidate/waiting only.
- Public registration does not instantly expand the active validator set.
- Public candidate/waiting state must not be confused with active validator admission.
- Candidate/waiting-only public registration is the intended Mainnet-0 launch posture; public active validator promotion/admission remains blocked unless a later launch-approved proof lane intentionally changes it.

Required work:

1. Record candidate/waiting-only public validator registration as the intended Mainnet-0 launch posture.
2. Keep public active validator admission disabled unless a later guarded config/runtime/proof lane intentionally changes it.
3. Prove live config represents candidate/waiting-only public registration.
4. Prove runtime endpoints agree.
5. Prove Precision and Alienware agree.
6. Update validator-status/current status files only after proof.

Definition of done:

- Public validator promotion/admission path is explicitly represented.
- Runtime validator truth agrees.
- Cross-box proof agrees.
- Status wording clearly says candidate/waiting public registration is the Mainnet-0 posture, not active validator admission.
- No private keys are committed.

## Cleared Blocker: first Buy VOID real fulfillment closeout is complete

Current Buy VOID state:

- Buy VOID create/watch is green.
- Buy VOID watcher config is active.
- Ethereum USDC support has been added.
- First real Ethereum USDC payment was verified.
- 2,500 VOID was fulfilled and recorded with a real VOID transaction reference.

Remaining work:

1. Keep Base and Ethereum lanes explicit in UI/copy.
2. Preserve no-blind-deposit/no-exchange-send rules.
3. Preserve payment-confirmed-is-not-VOID-sent guard.
4. Require explicit VOID transaction reference for every fulfillment.
5. Keep status proofs valid for both manual proof watches and real fulfilled watches.

Do not accept:

- blind direct deposits,
- exchange or custodial sends,
- fake TX_HASH values,
- payment claims without receipt verification,
- VOID fulfillment before payment verification.

Definition of done:

- First real payment/fulfillment closeout proof passed.
- Status proof accepts the real fulfilled Ethereum USDC state.
- Future Buy VOID work is product hardening, not a blocker for proving the first fulfillment.

## Guard 4: public launch promotion is complete; future expansions remain blocked

Public launch promotion is complete and proof-backed. Future expansions remain blocked unless separately approved:

1. Keep public active validator admission disabled unless a later guarded lane intentionally changes it.
2. Keep vault126 onboarding blocked unless a later guarded operator proof intentionally executes it.
3. Keep Buy VOID fulfillment explicit, payment-verified, and tx-ref-recorded.
4. Keep additional treasury spend blocked unless a new dry-run, tx, and post-state proof is recorded.

Definition of done:

- Public launch state remains public_mainnet0_live.
- Public active validator admission remains disabled.
- No extra treasury spend is authorized by this file.

## Operator rule

Do not change validator admission, vault126 onboarding, Buy VOID fulfillment, or treasury spend beyond this public launch-state promotion without a separate exact proof lane.
