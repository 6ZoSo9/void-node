# Mainnet-0 Validator and Fork Policy

Status: design-lock note for Mainnet-0 validator behavior and coordinated fork handling

## Purpose

This note locks the intended operational policy for Mainnet-0 so the network has explicit rules for validator behavior, fork handling, checkpointing, and operator response.

Mainnet-0 is a real canonical network, but still an early network. Correctness and recoverability matter more than pretending immutability is already perfect.

## Core posture

- Mainnet-0 is the canonical public network.
- Coordinated forks are allowed only when needed to restore correctness, recover from serious consensus/state faults, or remove clearly invalid/corrupt state transitions.
- Normal operation should strongly prefer continuity and stability.
- Forks are not for convenience, aesthetics, or routine governance disagreements.

## Validator policy

### Admission

Validators must be explicitly admitted through the intended validator-control path for the current phase.

Minimum expectations:

- validator identity is known to operators
- reward address is explicitly configured
- consensus key is explicitly configured
- validator is running the expected Mainnet-0 software/config
- validator understands the Mainnet-0 coordinated fork policy

### Required behavior

Validators must:

- follow the canonical Mainnet-0 release/config
- produce/accept blocks only under the intended network parameters
- refuse obviously invalid blocks
- monitor chain health, drift, and checkpoint status
- stop and seek operator guidance if they detect severe divergence or corrupted state

Validators must not:

- intentionally build on clearly invalid state
- silently continue on a minority fork once canonical policy is declared
- treat local convenience as justification for chain divergence

## Fork choice posture

Mainnet-0 should follow the canonical chain under the declared validator set and software policy.

In normal operation:

- prefer the expected canonical branch
- avoid unnecessary reorgs
- treat deep unexpected divergence as a fault condition, not business as usual

## Reorg policy

### Expected reorgs

- short incidental reorgs may happen in early operation
- operators should measure and document actual observed reorg behavior

### Unacceptable reorgs

These are fault conditions:

- repeated deep reorgs
- validator-set disagreement causing persistent branch split
- state divergence across honest nodes
- corrupted or invalid block/state transitions

## Checkpointing / finality posture

Mainnet-0 should have an explicit checkpoint/finality posture even if finality is still socially/operationally enforced.

The policy should answer:

- what height/checkpoint intervals are considered important
- what conditions make a checkpoint “accepted”
- what level of reorg past an accepted checkpoint is considered emergency territory
- what operator actions are required if a checkpoint is disputed

## Coordinated fork policy

A coordinated fork is allowed only for reasons such as:

- invalid state transition accepted by the chain
- consensus bug causing irreconcilable divergence
- corruption or major safety failure
- emergency recovery required to restore canonical correctness

A coordinated fork is not justified for:

- cosmetic cleanup
- personal preference
- ordinary disagreements that do not affect correctness/safety
- casual retries of policy choices

## Operator response policy

When a serious divergence is detected:

1. Freeze assumptions
   - do not assume the longest/live branch is automatically correct
   - collect head, state, drift, and validator observations

2. Classify severity
   - incidental short reorg
   - sustained divergence
   - invalid/corrupt state acceptance
   - checkpoint dispute
   - safety-critical failure

3. Choose response tier
   - observe only
   - validator/operator warning
   - temporary halt / stop-following minority path
   - coordinated canonical fork declaration

4. Communicate canonical policy
   - identify the intended canonical branch/checkpoint
   - identify required validator action
   - identify any required client/config change

## Timestamp / block sanity policy

Mainnet-0 should reject or flag blocks that violate intended timestamp sanity rules.

Policy should define:

- maximum acceptable timestamp drift
- whether future-skewed blocks are rejected or delayed
- what operator alert threshold exists for repeated drift problems

## Bad block / invalid state policy

If a bad block or invalid state transition is detected:

- do not normalize it as acceptable chain behavior
- treat it as a correctness incident
- determine whether the correct response is:
  - local rejection only
  - validator/operator coordination
  - canonical rollback / coordinated fork

## Required tracked artifacts

Mainnet-0 policy should eventually be reflected in tracked artifacts such as:

- validator admission/runbook
- fork response runbook
- checkpoint policy note
- bad-block incident checklist
- operator sanity script / proof script

## Current intent summary

Current Mainnet-0 intent is:

- real canonical network
- early-stage but serious
- coordinated forks allowed only when necessary to restore correctness/state
- no pretending that every divergence is acceptable
- no pretending that emergency intervention is forbidden when the chain is clearly wrong

## Follower reseed and conflicting import policy

`/blocks/import` is a suffix catch-up tool only. It is not a fork reconciliation tool.

Operator rules:
- clean suffix catch-up is allowed when the follower is missing later canonical blocks and there is no conflicting overlap
- overlapping conflicting imports must not be treated as a valid merge path
- if `/blocks/import` returns HTTP 409 or reports conflicting blocks, operators must stop treating the follower as converging normally

Required response to conflicting import:
1. stop the follower node
2. identify the canonical node
3. normalize canonical `heads.json` from canonical `head.txt`
4. reseed the follower data directory from the canonical node
5. restart follower and re-run readiness / peer truth checks

Mainnet-0 validators and operators must treat live conflict-merging as unsafe. Correctness is more important than pretending competing histories can be merged opportunistically.
