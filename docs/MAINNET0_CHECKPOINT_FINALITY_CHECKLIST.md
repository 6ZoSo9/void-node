# Mainnet-0 Checkpoint and Finality Checklist

Status: implementation checklist for checkpoint/finality policy artifacts

## Definition of done

This pillar is only “done enough” when all of the following are true:

- checkpoint/finality posture is written down
- accepted checkpoint concept is written down
- reorg severity tiers are written down
- checkpoint-crossing emergency posture is written down
- operator response sequence is written down
- validator expectations around checkpoints are written down
- a sanity/proof script exists to verify these artifacts are present

## Required artifact checklist

- `docs/MAINNET0_CHECKPOINT_FINALITY_POLICY.md`
- `docs/MAINNET0_CHECKPOINT_FINALITY_CHECKLIST.md`
- follow-on checkpoint incident/runbook artifact
- sanity/proof script for checkpoint/finality policy presence

## Policy questions that must eventually have explicit answers

### Checkpoint acceptance
- how are accepted checkpoints identified?
- what evidence is required to treat a checkpoint as accepted?

### Reorg severity
- what depth/frequency becomes Tier 1, Tier 2, Tier 3?
- what conditions automatically escalate a checkpoint incident?

### Finality posture
- what should operators assume before checkpoint acceptance?
- what should operators assume after checkpoint acceptance?

### Emergency handling
- what is the default response to a checkpoint-crossing reorg?
- who communicates canonical recovery guidance?

### Validator response
- what should validators do when a checkpoint is challenged?
- when should validators stop following an uncertain path?

## Immediate next tasks

1. Lock the checkpoint/finality policy note
2. Add sanity script that verifies the policy artifacts exist
3. Add follow-on docs for:
   - checkpoint incident response
   - reorg severity thresholds
   - validator checkpoint response runbook
