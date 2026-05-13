# VOID Mainnet-0 Prelaunch Safety Runbook

status: active
launch_state: not_go_for_public_mainnet0
operator_label: zoso
updated_at: 2026-04-30

## Purpose

This runbook defines the required safety check before any launch-adjacent Mainnet-0 action.

Required command:

    make mainnet0-prelaunch-safety-proof

## Hard rule

Before doing any of the following, run the prelaunch safety proof on Precision:

- validator live admission
- validator status promotion
- Buy VOID real fulfillment closeout
- Buy VOID VOID-send or fulfillment
- final public Mainnet-0 go/no-go
- any action that changes launch_state away from not_go_for_public_mainnet0

If the proof fails, stop.

Do not continue to validator live admission.
Do not continue to money handling.
Do not continue to public launch approval.

## What the proof checks

The prelaunch safety proof chains:

- mainnet0-status-proof
- mainnet0-gonogo-no-go-proof
- mainnet0-crossbox-status-smoke

It must prove:

- prelaunch_safety is green
- launch_state remains not_go_for_public_mainnet0
- go/no-go fails closed while blockers remain
- validator live admission is blocked
- Buy VOID launch remains blocked until explicit public Mainnet-0 approval
- money step remains last

## Where to run it

Run this on Precision:

    cd "$HOME/dev/void-node"
    make mainnet0-prelaunch-safety-proof

Alienware does not need Prometheus for this command. The proof calls cross-box smoke from Precision and only requires Alienware to pass status smoke.

## Expected current result

Expected current summary:

    prelaunch_safety: green
    launch_state: not_go_for_public_mainnet0
    go_no_go: fails_closed
    validator_live_admission: blocked
    buy_void_claim_send: blocked
    money_step: last

## Promotion rule

The validator promotion plan is documentation only until a future guarded live admission proof is created and passes.

Candidate or waiting registration is not active validator admission.

## Money rule

The money step remains last.

Do not run Buy VOID MODE=claim without a real Base native USDC transaction hash.

Do not accept blind direct deposits.

Do not accept exchange or custodial sends.

Do not send VOID from the Buy VOID path until the real payment claim proof is green.


## Buy VOID hard-stop gate

Before Mainnet-0 approval, this gate is mandatory:

Required command: make buy-void-hardstop-proof

This composite proof must prove operator fulfillment rules, payment-confirmed does not send VOID, fulfillment fails closed without an explicit operator VOID tx reference, Base claim rehearsal remains claim-only, fake claim txs fail closed, and backend readiness is read-only/fail-closed.

Payment confirmation is not VOID sent. Claim verification is not fulfillment. The money step remains last.
