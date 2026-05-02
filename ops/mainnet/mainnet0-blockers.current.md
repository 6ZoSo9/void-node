# VOID Mainnet-0 Remaining Blockers

status: active
launch_state: not_go_for_public_mainnet0
operator_label: zoso
updated_at: 2026-05-02

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
- Operator/bootstrap validator runtime truth is green through epoch125.
- vault123 live admission completed successfully.
- Epoch125 reports validatorCount=124, totalPower=124000000000000000000000, published=true, and publishedMatch=true.
- Durable 8545 restore lane is green and can recover local RPC state to epoch125.
- Mainnet-0 prelaunch safety proof is green for epoch125.
- Live-admission dry-run proof is dynamic and currently points to vault124 / epoch126 while still blocking mutation without confirm:true.
- Buy VOID Base create/watch path is green.
- Buy VOID safety copy is live.
- Buy VOID watcher config is set on both boxes.
- Validator public keys are recorded.
- Validator policy review is recorded.
- Go/no-go wrapper intentionally exits NO-GO while blockers remain.
- Validator admission blocker proof is green and proves public registration is plan-only/waiting/not-active.
- Validator admission promotion plan proof is green and proves the future promotion path remains plan-only and non-mutating.

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

- Operator/bootstrap validator runtime truth is green through epoch125.
- vault123 is admitted in the operator/bootstrap validator set.
- The next operator selector is vault124 targeting epoch126.
- Public participant validator registration remains candidate/waiting only.
- Public registration does not instantly expand the active validator set.
- Public candidate/waiting state must not be confused with active validator admission.

Required work:

1. Decide the final public validator admission/promotion path.
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

## Blocker 3: Buy VOID real claim/send is not complete

Current Buy VOID state:

- Buy VOID create/watch is green.
- Buy VOID watcher config is real Base native USDC.
- Buy VOID real payment claim has not been run.
- No real Base USDC transaction hash has been verified.
- No VOID has been sent from the Buy VOID claim path.

Required work, intentionally later:

1. Operator intentionally sends Base native USDC from a self-custody wallet.
2. Operator records the real Base transaction hash.
3. Operator runs MODE=claim with the saved OUT_JSON and real TX_HASH.
4. Proof verifies receiver, token, amount, and transaction success.
5. Fulfillment remains blocked unless the payment proof passes.

Do not accept:

- blind direct deposits,
- exchange or custodial sends,
- fake TX_HASH values,
- payment claims without receipt verification,
- VOID fulfillment before payment verification.

Definition of done:

- Claim proof passes with real Base transaction hash.
- Payment is verified on Base.
- VOID fulfillment path records the sent transaction.
- Status file records Buy VOID claim/send as complete.

## Blocker 4: final go/no-go remains blocked

Current behavior:

- ops/mainnet0-go-no-go-with-validator-lifecycle.sh intentionally exits rc=2 with NO-GO while blockers remain.
- Mainnet-0 prelaunch safety proof is green, but still intentionally records launch_state=not_go_for_public_mainnet0.

Required work:

1. Clear public validator admission/promotion blocker.
2. Clear Buy VOID real claim/send blocker.
3. Re-run full Precision proof.
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
