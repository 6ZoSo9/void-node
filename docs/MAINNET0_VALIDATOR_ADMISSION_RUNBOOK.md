# Mainnet-0 Validator Admission Runbook

Status: design-lock note for Mainnet-0 validator admission, minimum requirements, and ongoing operator expectations

## Purpose

This runbook defines how validators should be admitted and operated during Mainnet-0.

Mainnet-0 is not open-ended “anything goes” validator behavior. Validators are part of canonical continuity, checkpoint posture, incident handling, and coordinated recovery if the chain is wrong.

---

## Core posture

- Validator participation in Mainnet-0 must be explicit, not casual.
- Validators must run the intended Mainnet-0 software/config.
- Validators must understand checkpoint/finality posture, incident handling, and coordinated recovery policy.
- Validators that cannot follow the canonical policy should not be admitted for the current phase.

---

## Admission requirements

A validator should not be admitted unless all of the following are known and recorded:

### Identity / ownership
- validator identifier is known to operators
- operator contact/resolution path is known
- validator reward address is known
- validator consensus key is known

### Software / config
- validator is running the intended Mainnet-0 branch/release
- validator has the intended canonical config
- validator is not knowingly running stale or incompatible parameters
- validator understands current chain/network identity

### Operational readiness
- validator can report head/health/drift status
- validator can monitor checkpoint/finality posture
- validator can respond to operator coordination during incident mode
- validator can stop following a bad/disfavored path when canonical guidance is declared

### Policy acceptance
- validator understands fork/reorg policy
- validator understands checkpoint/finality policy
- validator understands bad-block / invalid-state response policy
- validator understands coordinated recovery policy

---

## Minimum admission record

Each admitted validator should have a tracked admission record that includes at least:

- validator label/id
- operator label/contact path
- reward address
- consensus key
- software version / branch / build identity
- admission date
- current status:
  - candidate
  - admitted
  - warned
  - paused
  - removed

---

## Pre-admission checks

Before admitting a validator, operators should verify:

- expected software/config identity
- expected branch/version identity
- ability to observe head/health/drift
- ability to communicate during incidents
- no known severe divergence from canonical config
- validator understands Mainnet-0 policy posture

---

## Ongoing validator expectations

Admitted validators should:

- monitor node health
- monitor head/drift/checkpoint posture
- monitor incident guidance
- report serious divergence early
- avoid casual operation on uncertain paths during incident conditions

Validators should not:

- remain on clearly stale config
- ignore checkpoint/finality incident posture
- continue on clearly disfavored branch after canonical guidance
- normalize repeated medium/deep reorgs as harmless
- treat invalid-state suspicion as normal noise

---

## Warning / pause / removal posture

### Warning

Issue warning when validator:

- shows repeated unhealthy behavior
- fails to track canonical posture cleanly
- appears slow to respond to operator guidance
- contributes to recurring instability without clear resolution

### Pause

Pause validator participation when:

- validator is believed to be materially out of sync with canonical policy
- validator is following a clearly uncertain path during incident handling
- operator confidence in validator behavior is temporarily low

### Removal

Remove validator from current Mainnet-0 participation when:

- validator cannot or will not follow canonical policy
- validator repeatedly undermines convergence/stability
- validator remains materially incompatible with intended release/config
- validator ignores explicit coordinated recovery guidance

---

## Incident expectations for validators

During incident mode, validators should:

- collect/report local evidence
- avoid strong unsupported claims
- follow declared canonical response guidance
- stop casual branch-following when checkpoint/correctness is in question

During incident mode, validators should not:

- freewheel onto uncertain branches
- continue normal assumptions after Tier R3 / canonical safety incident
- pretend policy guidance is optional

---

## Operator-side admission responsibilities

Operators should:

- keep admission expectations explicit
- keep validator status visible
- keep runbooks/checklists current
- avoid ambiguous “everyone just kind of knows the rules” posture
- document warnings / pauses / removals

---

## Current Mainnet-0 intent summary

Current validator-admission intent is:

- validator participation is explicit
- identity/config/policy alignment matters
- validators are expected to cooperate during incidents
- Mainnet-0 is not permissionless-chaotic validator behavior
- admission is tied to canonical continuity and recoverability

## Operator sync safety rule

Before admitting or re-admitting a validator/follower into normal operation, operators must follow this sync safety rule:

- use `/blocks/import` only for clean suffix catch-up
- do not use `/blocks/import` to reconcile conflicting overlapping ranges
- if import detects conflicts or returns HTTP 409, stop the follower and reseed it from the canonical node
- confirm canonical `heads.json` matches canonical `head.txt` before reseeding
- only return the follower to service after readiness and peer truth checks are green

A candidate operator who treats conflicting overlap import as normal recovery is not following Mainnet-0 operational policy.
