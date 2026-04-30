# VOID Mainnet-0 Current Status

status: not_go_for_public_mainnet0
updated_at: 2026-04-30
operator_label: zoso

## Green / ready signals

- Precision node readiness is green.
- Alienware node readiness is green.
- Update safety gate is green.
- Validator lifecycle composite gate is green.
- Buy VOID Base create/watch path is green.
- Buy VOID payment safety copy is live.
- Buy VOID watcher config uses Base native USDC.
- Operator checkpoint/finality policy review is recorded.
- Validator public reward address and consensus key are recorded.

## Still not done

- Buy VOID real payment claim has not been run.
- No real Base USDC transaction hash has been verified.
- No VOID has been sent from the Buy VOID claim path.
- Validator is still a plan-only candidate.
- Validator is not active.
- Validator is not live admitted.
- Mainnet-0 launch go/no-go has not been approved.
- Mainnet-0 go/no-go NO-GO proof is green and proves the wrapper fails closed while blockers remain.
- Mainnet-0 blockers proof now includes validator admission blocker proof and validator promotion plan proof.

## Current validator admission state

The validator status file currently reports:

- status: plan_only_candidate_declared
- reason: plan-only live config declares validator candidate; not active or live admitted

This is intentional. Do not describe the validator as active until the live config, runtime endpoints, and cross-box checks all agree.

## Current Buy VOID state

Buy VOID is ready for a controlled real-money test, but not completed.

The safe next real-money step requires:

1. The operator intentionally sends Base native USDC from a self-custody wallet.
2. The operator records the real Base transaction hash.
3. The operator runs MODE=claim with the saved proof OUT_JSON and real TX_HASH.
4. The claim proof verifies the transaction before any fulfillment claim is accepted.

Do not accept blind direct deposits.
Do not accept exchange or custodial sends.
Do not run MODE=claim without a real Base transaction hash.

## Operator rule

Ready signals are not the same as launch approval.

Mainnet-0 remains not-go until remaining launch blockers are cleared and a final go/no-go bundle is run intentionally.
