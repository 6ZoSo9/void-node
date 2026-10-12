# Mainnet-0 Validator Actions: Warning / Pause / Removal

Status: operator procedure for validator enforcement actions during Mainnet-0

## Purpose

This procedure defines how operators should handle validators that drift from Mainnet-0 policy, canonical posture, or incident guidance.

---

## Warning

Issue a warning when a validator:

- shows recurring unhealthy behavior
- appears slow to follow canonical guidance
- contributes to instability without crossing into immediate removal territory
- repeatedly fails soft expectations but is still recoverable

### Warning procedure

1. Record validator_id and current status
2. Record reason for warning
3. Record relevant evidence
4. Notify validator/operator contact path
5. Set follow-up expectation and review window
6. Update validator status record

---

## Pause

Pause a validator when:

- confidence in validator behavior is temporarily too low
- validator is following an uncertain/disfavored branch during incident handling
- validator appears materially out of sync with canonical policy
- operator needs a reversible safety action while facts are still being gathered

### Pause procedure

1. Record validator_id and current status
2. Record pause reason
3. Record incident/reorg/checkpoint context
4. Notify validator/operator contact path
5. Mark validator as paused in status record
6. Define resume criteria

---

## Removal

Remove a validator from current Mainnet-0 participation when:

- validator cannot or will not follow canonical policy
- validator repeatedly undermines convergence/stability
- validator ignores explicit coordinated recovery guidance
- validator remains materially incompatible with intended release/config

### Removal procedure

1. Record validator_id and current status
2. Record exact removal reason
3. Record supporting evidence
4. Notify validator/operator contact path
5. Mark validator as removed in status record
6. Record any re-admission conditions if applicable

---

## Evidence requirements

Before warning/pause/removal, gather as much of the following as possible:

- head / health / drift evidence
- checkpoint / reorg / incident context
- validator branch behavior
- version/config mismatch evidence
- operator communication attempts
- whether issue is one-off or repeated

---

## Current intent summary

- warning = recoverable problem
- pause = temporary safety action
- removal = current-phase ineligibility
- every action should leave a record
