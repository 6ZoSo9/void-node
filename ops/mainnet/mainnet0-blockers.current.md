# VOID Mainnet-0 Remaining Blockers

status: active
launch_state: not_go_for_public_mainnet0
operator_label: zoso
updated_at: 2026-05-17

## Purpose

This file lists the remaining Mainnet-0 blockers in the intended execution order.

The money step is intentionally last.

## Current known-good baseline

Current healthy-but-not-launch posture:

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
- Go/no-go wrapper intentionally exits NO-GO while blockers remain.
- Validator admission blocker proof is green and proves public registration is plan-only/waiting/not-active.
- Validator admission promotion plan proof is green and proves the future promotion path remains plan-only and non-mutating.
- Validator live-admission readiness must be refreshed against the current vault126 / epoch128 selector before any future operator mutation.
- Validator next-onboard intent gate proof is green and cross-box proven: missing/wrong operator intent fails before the live env switch, exact intent remains blocked while VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION is off.

## Blocker 1: maintain status proof discipline

Required before every major launch-adjacent change:

- Run make mainnet0-status-proof on Precision.
- Run make mainnet0-crossbox-status-smoke from Precision.
- Keep status file at not_go_for_public_mainnet0 until all blockers are actually cleared.

Definition of done:

- Precision full proof passes.
- Cross-box smoke passes.
- No script says public launch is approved.

## Blocker 2: public validator admission is not promoted

Current validator state:

- Operator/bootstrap validator runtime truth is green through epoch127.
- vault123 and vault125 are admitted in the operator/bootstrap validator set.
- The next operator selector is vault126 targeting epoch128.
- Vault125 guarded operator live admission executed and epoch127 runtime truth is recovered; future operator admission remains blocked until a new guarded proof.
- Next-onboard intent gate is green, but live admission remains blocked unless an explicit guarded live proof enables the env switch and supplies the exact operator intent.
- Public participant validator registration remains candidate/waiting only.
- Public registration does not instantly expand the active validator set.
- Public candidate/waiting state must not be confused with active validator admission.

Required work:

1. Decide the final public validator admission/promotion path. Readiness is green; guarded live admission is still not executed.
2. Promote only through guarded config/runtime/proof lanes.
3. Prove live config represents the intended public admission state.
4. Prove runtime endpoints agree.
5. Prove Precision and Alienware agree.
6. Update validator-status/current status files only after proof.

Definition of done:

- Public validator promotion/admission path is explicitly represented.
- Runtime validator truth agrees.
- Cross-box proof agrees.
- Status wording no longer relies on plan-only candidate state.
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

## Blocker 4: final go/no-go remains blocked

Current behavior:

- ops/mainnet0-go-no-go-with-validator-lifecycle.sh intentionally exits rc=2 with NO-GO while blockers remain.
- Mainnet-0 prelaunch safety proof is green, but still intentionally records launch_state=not_go_for_public_mainnet0.

Required work:

1. Clear public validator admission/promotion blocker.
2. Re-run full Precision proof.
4. Re-run cross-box smoke.
5. Update status files deliberately.
6. Run final go/no-go intentionally.

Definition of done:

- Final go/no-go no longer depends on temporary or assumed state.
- Public Mainnet-0 approval is explicit, not inferred from readiness.
- The repo contains proof artifacts or scripts sufficient to reproduce the claim.

## Operator rule

Ready signals are not launch approval.

Do not change launch_state away from not_go_for_public_mainnet0 until the blockers above are cleared and final go/no-go is run intentionally.
