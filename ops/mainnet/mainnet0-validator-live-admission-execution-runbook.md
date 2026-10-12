# Mainnet-0 Validator Live-Admission Execution Runbook

status: plan_only
launch_state: not_go_for_public_mainnet0
mutation_allowed_by_this_doc: false
operator_label: zoso
candidate: vault126
target_epoch: 128
expected_validator_count: 127
operator_intent: ADMIT_vault126_EPOCH_128_COUNT_127

## Purpose

This runbook records the guarded path for the future live-admission execution step.

It is not an execution approval.

It does not activate a validator.
It does not mutate live validator state.
It does not change launch_state away from not_go_for_public_mainnet0.
It does not clear the Buy VOID blocker.
It does not approve public Mainnet-0 launch.

## Current proven state

The validator next-onboard intent gate is green and cross-box proven.

The current safe route requires all of the following before live onboarding can run:

1. POST confirm:true.
2. Exact operator intent fields:
   - expected_candidate=vault126
   - expected_target_epoch=128
   - expected_validator_count=127
   - operator_intent=ADMIT_vault126_EPOCH_128_COUNT_127
3. VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1.
4. Current node readiness green.
5. Validator live-admission readiness proof green.
6. Mainnet-0 status proof green on Precision.
7. Cross-box status smoke green.
8. No private keys committed.
9. Money step remains last.

Missing operator intent must fail with operator_intent_required before the live env switch matters.

Wrong operator intent must fail with operator_intent_mismatch before the live env switch matters.

Exact operator intent must still fail with live_execution_disabled while VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION is unset.

## Required preflight before any future mutation

Before any future live admission attempt, run and capture:

    make mainnet0-validator-next-onboard-live-gate-proof
    make mainnet0-validator-live-admission-readiness-proof
    make mainnet0-status-proof
    make mainnet0-crossbox-status-smoke
    make mainnet0-prelaunch-safety-proof

All must pass from clean repo state.

The selector must still match:

    selected_candidate=vault126
    target_epoch=128
    expected_validator_count=127

If selector values change, this runbook must not be used. Create a new runbook for the new candidate/epoch/count.

## Future live execution shape

The future live execution, if intentionally approved later, must be done from an explicitly guarded shell where the live env switch exists only for that command window.

Expected request body:

    {
      "confirm": true,
      "expected_candidate": "vault126",
      "expected_target_epoch": 128,
      "expected_validator_count": 127,
      "operator_intent": "ADMIT_vault126_EPOCH_128_COUNT_127"
    }

Expected endpoint:

    POST /__void/participant/stake/next-onboard

Expected live switch:

    VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1

The live switch must not be persistent in systemd user environment after the command completes.

## Required postflight after any future mutation

After a future live admission attempt, immediately prove:

1. Runtime validator truth reports the expected new epoch/count.
2. Candidate state moved exactly as intended.
3. Active validator count changed only by the expected amount.
4. Cross-box status smoke passes.
5. Mainnet-0 status proof passes.
6. Launch state still remains not_go_for_public_mainnet0 unless separately approved.
7. Buy VOID blocker remains uncleared unless separately proven.

## Hard stops

Stop immediately if any of these occur:

- selector is not vault126 / epoch128 / expected count 127
- missing or mismatched operator intent
- live env switch appears persistent outside the guarded command
- node readiness is not green
- cross-box smoke fails
- status proof fails
- private key or secret appears in git diff
- Buy VOID status is accidentally changed
- launch_state changes away from not_go_for_public_mainnet0

## Current decision

Do not execute live admission yet.

This document exists so the future mutation path is explicit, reviewable, and proof-gated.
