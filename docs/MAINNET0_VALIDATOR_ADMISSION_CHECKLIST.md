# Mainnet-0 Validator Admission Checklist

Status: implementation checklist for validator admission/runbook artifacts

## Definition of done

This pillar is only “done enough” when all of the following are true:

- validator admission expectations are written down
- minimum validator record fields are written down
- pre-admission checks are written down
- ongoing validator expectations are written down
- warning / pause / removal posture is written down
- incident expectations for validators are written down
- a sanity/proof script exists to verify these artifacts are present

## Required artifact checklist

- `docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md`
- `docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md`
- future validator status/admission record artifact
- sanity/proof script for validator admission artifact presence

## Policy questions that must eventually have explicit answers

### Identity / ownership
- how are validator identities tracked?
- how is operator contact/resolution tracked?

### Software / config
- what exact version/config rules are mandatory?
- how are validators checked for compatibility?

### Operational readiness
- what health/drift/head checks must a validator expose?
- what minimum monitoring is required?

### Incident behavior
- what is a validator required to do during incident mode?
- what failures trigger warning, pause, or removal?

### Participation status
- how is validator status recorded over time?
- what evidence supports pause/removal decisions?

## Immediate next tasks

1. Lock the validator admission runbook
2. Add sanity script that verifies the admission artifacts exist
3. Add follow-on artifacts for:
   - validator status record format
   - validator warning/pause/removal procedure
   - validator operator contact/runbook notes
