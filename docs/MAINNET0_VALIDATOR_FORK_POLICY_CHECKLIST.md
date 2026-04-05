# Mainnet-0 Validator and Fork Policy Checklist

Status: implementation checklist for validator/fork policy artifacts

## Definition of done

This pillar is only “done enough” when all of the following are true:

- validator policy is written down
- fork/reorg policy is written down
- coordinated fork conditions are written down
- unacceptable divergence conditions are written down
- checkpoint/finality posture is written down
- timestamp drift posture is written down
- operator response steps are written down
- a sanity/proof script exists to verify these artifacts are present

## Required artifact checklist

- `docs/MAINNET0_VALIDATOR_FORK_POLICY.md`
- validator admission/runbook artifact
- checkpoint/finality artifact
- bad-block / incident-response artifact
- sanity/proof script for policy presence

## Policy questions that must eventually have explicit answers

### Validator admission
- who can join in Mainnet-0?
- how is validator identity tracked?
- what minimum config is required?

### Canonical fork choice
- what is the intended canonical choice rule?
- what counts as a fault versus normal variance?

### Checkpointing
- what checkpoints matter?
- what reorg depth becomes emergency territory?

### Coordinated fork threshold
- what exact categories justify a coordinated fork?
- who declares canonical recovery in practice during Mainnet-0?

### Operator handling
- what do nodes/operators do when they detect divergence?
- what gets collected before action is taken?
- what is communicated to validators?

### Time/block sanity
- what timestamp drift is acceptable?
- what repeated drift behavior becomes an incident?

## Immediate next tasks

1. Lock the main policy note
2. Add sanity script that verifies the policy artifacts exist
3. Add follow-on docs for:
   - checkpoint/finality posture
   - incident/bad-block response
   - validator admission/runbook
