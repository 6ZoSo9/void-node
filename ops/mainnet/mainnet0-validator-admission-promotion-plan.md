# VOID Mainnet-0 Validator Admission Promotion Plan

status: plan_only
launch_state: not_go_for_public_mainnet0
operator_label: zoso
updated_at: 2026-04-30
mutation_allowed: false

## Purpose

This document defines the intended path from plan-only validator candidate to live admitted validator.

This plan does not activate a validator.
This plan does not mutate live validator state.
This plan does not approve public Mainnet-0 launch.

## Current state

The current validator is still a plan-only candidate.

Expected current state:

- live JSON mode is plan_only.
- live JSON status is plan_only_not_live.
- candidate-validator-01 status is candidate_not_active.
- validator-status.current.yaml says plan_only_candidate_declared.
- participant registration state is waiting.
- public registration does not mutate the active validator set.
- activeCountFinal remains 0.
- waitingCountFinal remains 1.

## Promotion principle

Public validator registration is not active validator admission.

Public registration creates a candidate or waiting record. Active validator admission is a separate operator-governed, capped, epoch-controlled step.


## Locked public admission policy

Any future public validator admission or promotion path must preserve the locked Mainnet-0 validator policy:

- public candidate minimum stake: 10000 VOID
- active validator cap: 256
- activation churn limit per epoch: 4
- public registration result: candidate_or_waiting_only
- public registration directly mutates active set: false
- active admission requires guarded operator epoch step: true
- money step remains last: true

Current public candidate/registration proof lanes are aligned to the locked 10000 VOID Mainnet-0 admission policy.

Before public Mainnet-0 activation, controlled proof lanes and public candidate/admission paths must continue to enforce the 10000 VOID minimum stake policy.

## Promotion phases

### Phase 1: preserve blocker truth

Before doing any live admission work:

- run make mainnet0-validator-admission-blocker-proof
- run make mainnet0-blockers-proof
- run make mainnet0-crossbox-status-smoke

Expected result:

- validator remains waiting.
- active validator count remains 0 for this candidate registry proof.
- launch remains not_go_for_public_mainnet0.

### Phase 2: prepare live admission artifact

Create a new explicit live admission artifact before mutating anything.

The artifact must include:

- candidate id,
- reward address,
- consensus key,
- intended active admission state,
- intended epoch boundary,
- expected validator count,
- operator approval marker,
- no private keys.

The artifact must not include:

- private keys,
- mnemonic material,
- raw keystore passphrases,
- unreviewed addresses,
- unstated validator count changes.

### Phase 3: dry-run admission proof

Before live admission:

- prove live JSON is still plan_only.
- prove active count has not changed.
- prove candidate is waiting.
- prove promotion artifact is complete.
- prove no private keys are present in the promotion artifact.
- prove the intended validator count and epoch are explicit.

### Phase 4: guarded live admission

Live admission may only occur after the dry-run proof is green.

Guard requirements:

- operator explicitly enables live admission.
- final promotion artifact is present.
- validator public keys are recorded.
- live config change is reviewed.
- runtime validator truth is checked after admission.
- Precision and Alienware agree after sync.

### Phase 5: post-admission proof

After live admission:

- prove live JSON no longer describes this validator as candidate_not_active.
- prove validator-status.current.yaml no longer says plan_only_candidate_declared.
- prove runtime validator truth includes the admitted validator as intended.
- prove cross-box validator truth agrees.
- prove no private keys were committed.
- update mainnet0-status.current.md.
- update mainnet0-blockers.current.md.

## Explicit non-goal

This plan does not clear the Buy VOID blocker.

The money step remains last.

## Current blocker status

Validator live admission remains blocked until a future live admission proof clears it.

Buy VOID real claim/send remains blocked until a real Base native USDC transaction hash is verified.

Final public Mainnet-0 go/no-go remains blocked until all blockers are explicitly cleared.
