# VOID Mainnet-0 Current Status

status: not_go_for_public_mainnet0
updated_at: 2026-05-02
operator_label: zoso

## Green / ready signals

- Precision node readiness is green.
- Alienware node readiness is green.
- Update safety gate is green.
- Validator lifecycle composite gate is green.
- Operator/bootstrap validator runtime truth is green through epoch125.
- vault123 live admission completed successfully.
- Epoch125 reports validatorCount=124, totalPower=124000000000000000000000, published=true, and publishedMatch=true.
- Durable local RPC restore lane is green for epoch125.
- Mainnet-0 prelaunch safety proof is green for epoch125.
- Buy VOID Base create/watch path is green.
- Buy VOID payment safety copy is live.
- Buy VOID watcher config uses Base native USDC.
- Operator checkpoint/finality policy review is recorded.
- Validator public reward address and consensus key are recorded.

## Still not done

- Public validator candidate promotion/admission remains blocked.
- Public candidate/waiting registration must not be confused with operator/bootstrap validator admission.
- Buy VOID real payment claim has not been run.
- No real Base USDC transaction hash has been verified.
- No VOID has been sent from the Buy VOID claim path.
- Mainnet-0 launch go/no-go has not been approved.
- Mainnet-0 go/no-go NO-GO proof is green and proves the wrapper fails closed while blockers remain.
- Mainnet-0 blockers proof includes validator admission blocker proof and validator promotion plan proof.
- Money step remains last.

## Current validator admission state

Two validator tracks must stay separate:

1. Operator/bootstrap validator runtime truth:
   - latestEpoch: 125
   - validatorCount: 124
   - active validator count on recovered 8545 state: 124
   - next operator candidate selector: vault124 targeting epoch126 / expectedValidatorCount=125
   - durable 8545 restore lane is green.

2. Public participant validator registration:
   - public registration/candidate/waiting status remains non-launching.
   - public registration does not mutate the active validator set.
   - candidate/waiting state is not active validator admission.
   - promotion remains plan-only and non-mutating until intentionally changed through a guarded proof lane.

Do not describe public validator registration as active until the live config, runtime endpoints, and cross-box checks all agree.

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


## Buy VOID hard-stop gate

- Buy VOID hard-stop composite proof is wired into Mainnet-0 prelaunch safety.
- Buy VOID hard-stop proof target: make buy-void-hardstop-proof.
- Payment confirmation does not equal VOID sent.
- Fulfillment still requires an explicit operator VOID transaction reference.
- Real Buy VOID payment claim/send remains blocked until the final operator money step.
