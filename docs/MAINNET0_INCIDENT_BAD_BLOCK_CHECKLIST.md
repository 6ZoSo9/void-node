# Mainnet-0 Incident and Bad-Block Checklist

Status: implementation checklist for bad-block and incident-response artifacts

## Definition of done

This pillar is only “done enough” when all of the following are true:

- bad-block policy is written down
- incident severity tiers are written down
- evidence collection expectations are written down
- local rejection vs coordinated response boundary is written down
- rollback/coordinated fork threshold is written down
- operator response sequence is written down
- validator incident expectations are written down
- a sanity/proof script exists to verify these artifacts are present

## Required artifact checklist

- `docs/MAINNET0_INCIDENT_BAD_BLOCK_POLICY.md`
- `docs/MAINNET0_INCIDENT_BAD_BLOCK_CHECKLIST.md`
- operator incident runbook artifact
- validator incident response artifact
- sanity/proof script for policy artifact presence

## Policy questions that must eventually have explicit answers

### Bad block definition
- what exact block/state faults count as invalid?
- what evidence is enough to classify the issue?

### Escalation
- when is local rejection enough?
- when does the incident become canonical-risk or safety-critical?

### Checkpoint interaction
- when does a bad block threaten accepted checkpoint posture?
- what defaults apply if checkpoint contamination is suspected?

### Coordinated recovery
- when is rollback justified?
- who communicates canonical recovery instructions?

### Validator handling
- what should validators do immediately on suspected invalid state?
- when should validators stop building/following?

## Immediate next tasks

1. Lock the bad-block/incident policy note
2. Add sanity script that verifies the policy artifacts exist
3. Add follow-on docs for:
   - operator incident runbook
   - validator incident response guide
   - concrete evidence bundle checklist
