# Mainnet-0 Incident and Bad-Block Policy

Status: design-lock note for bad-block handling, invalid state response, and incident escalation

## Purpose

This note defines how Mainnet-0 operators and validators should respond when a block, state transition, or branch is believed to be invalid, corrupt, or safety-threatening.

Mainnet-0 is a real canonical network, but it is still an early network. That means correctness incidents must be handled explicitly and quickly instead of being normalized.

---

## Core posture

- A bad block or invalid state transition is a correctness incident.
- Correctness incidents are not treated as ordinary chain variance.
- Local rejection may be enough for isolated invalid blocks.
- Coordinated response is required when invalid/corrupt state is accepted by live chain participants or threatens canonical continuity.
- Correctness is more important than pretending every produced block deserves passive acceptance.

---

## Definitions

### Bad block

A bad block is a block that should not be considered valid under intended Mainnet-0 rules.

Examples may include:

- malformed or corrupt block content
- invalid state transition
- invalid header/body consistency
- invalid txroot / block-root assumptions
- timestamp behavior outside intended policy
- block built on clearly invalid prior state

### Invalid state transition

A state transition is invalid when applying the block should not produce the claimed next state under intended canonical rules.

### Incident mode

Incident mode begins when operators stop treating the issue as ordinary variance and begin explicit investigation/recovery handling.

### Canonical safety incident

A canonical safety incident exists when the suspected bad block/state is no longer just a local curiosity and may affect canonical chain correctness, checkpoint integrity, validator convergence, or operator trust in state.

---

## Severity tiers

### Tier 0 — Suspected local anomaly

Examples:

- one node reports odd parsing or local corruption
- no evidence live chain accepted bad state
- peers do not confirm the issue

Response:

- inspect locally
- gather evidence
- do not escalate yet unless more signs appear

### Tier 1 — Confirmed bad block, limited scope

Examples:

- bad block confirmed locally
- issue rejected by honest nodes
- canonical chain does not appear to accept the bad state

Response:

- reject locally
- gather reproducible evidence
- alert operators
- monitor whether issue spreads

### Tier 2 — Canonical risk incident

Examples:

- some validators/nodes appear to accept the bad block/state
- live branch may include invalid/corrupt transition
- divergence grows around suspected invalid state
- checkpoint confidence is affected

Response:

- enter incident mode
- stop assuming the live branch is correct
- collect chain/state/validator evidence
- prepare explicit canonical guidance

### Tier 3 — Canonical safety failure

Examples:

- invalid/corrupt state survives on the apparent live/canonical path
- accepted checkpoint is contaminated by bad state
- honest nodes disagree on state validity after the bad block
- rollback / coordinated fork becomes a realistic recovery path

Response:

- treat as emergency
- coordinate validator/operator response immediately
- declare canonical recovery policy if needed
- do not normalize continued operation on the bad path

---

## Evidence collection requirements

Before strong action, gather as much of the following as possible:

- suspected bad block height/hash
- parent block height/hash
- local head and peer head
- txroot / header / persisted-state evidence
- validator observations
- checkpoint relationship
- whether issue is local-only or network-visible
- whether honest nodes reproduce the problem

Evidence should aim to answer:

- is the block actually invalid?
- is the invalidity local or shared?
- did live chain participants accept it?
- does it affect canonical continuity?
- does it cross or threaten an accepted checkpoint?

---

## Local rejection policy

Local rejection is appropriate when:

- issue is isolated
- bad block is clearly invalid
- canonical chain does not appear to accept it
- checkpoint integrity is not threatened

Local rejection alone is not enough when:

- network participants are diverging over validity
- bad state is spreading on live path
- checkpoint/finality posture is threatened
- validators need explicit canonical guidance

---

## Coordinated response policy

Coordinated response is required when:

- validators disagree on bad block acceptance
- invalid state is present on a live branch
- branch split persists around suspected invalid state
- accepted checkpoint may be affected
- rollback / coordinated fork may be needed

Coordinated response may include:

- explicit operator warning
- validator pause/hold guidance
- declaration of invalid branch
- declaration of canonical recovery branch
- rollback / coordinated fork guidance

---

## Rollback / coordinated fork threshold

A rollback or coordinated fork is justified only when needed to restore correctness, such as:

- invalid state accepted on live path
- corrupt or unrecoverable canonical state
- accepted checkpoint contaminated by bad transition
- honest convergence impossible without explicit recovery

A rollback or coordinated fork is not justified for:

- cosmetic repair
- convenience
- ordinary short reorgs
- subjective preference without correctness/safety impact

---

## Operator response sequence

1. Freeze assumptions
   - do not assume the live branch is automatically canonical
   - do not assume continued block production means correctness

2. Classify severity
   - Tier 0
   - Tier 1
   - Tier 2
   - Tier 3

3. Gather evidence
   - bad block details
   - state transition evidence
   - validator observations
   - checkpoint relationship
   - drift/divergence evidence

4. Decide response level
   - local rejection only
   - operator alert
   - incident mode
   - coordinated recovery / fork guidance

5. Communicate canonical policy
   - identify suspected bad block/state
   - identify whether nodes should halt, reject, or follow recovery guidance
   - identify whether checkpoint posture changed

---

## Validator expectations during bad-block incidents

Validators should:

- treat suspected invalid state seriously
- gather and report evidence quickly
- avoid casually building on clearly questionable state
- follow explicit canonical incident guidance once declared

Validators should not:

- normalize bad-state acceptance as “just early-network variance”
- continue on a clearly disfavored invalid path after guidance is issued
- hide divergence or invalidity evidence

---

## What counts as unacceptable behavior

The following are unacceptable:

- treating confirmed invalid state as ordinary variance
- allowing checkpoint-contaminated state to persist without incident handling
- continuing on clearly bad path after canonical response is declared
- failing to gather evidence before making strong claims
- failing to escalate when canonical correctness is genuinely threatened

---

## Required tracked artifacts

Mainnet-0 bad-block/incident posture should eventually be reflected in:

- bad-block policy note
- incident checklist
- operator incident runbook
- validator incident response guidance
- sanity/proof script for artifact presence

---

## Current intent summary

Current Mainnet-0 bad-block intent is:

- bad block = correctness incident
- local rejection is sometimes enough
- canonical safety incidents require coordination
- checkpoint contamination is emergency territory
- rollback/coordinated fork allowed only to restore correctness
