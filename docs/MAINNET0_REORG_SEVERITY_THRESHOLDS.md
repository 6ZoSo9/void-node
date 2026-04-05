# Mainnet-0 Reorg Severity Thresholds

Status: design-lock note for practical reorg severity tiers and escalation thresholds

## Purpose

This note defines how Mainnet-0 should classify reorg depth/frequency and when operators must escalate from observation to incident handling.

This is not meant to pretend the network has perfect finality. It is meant to make reorg severity explicit enough that operators and validators do not hand-wave serious divergence.

---

## Core posture

- Short incidental reorgs may occur in Mainnet-0.
- Reorgs are not automatically emergencies.
- Repeated, persistent, or checkpoint-crossing reorgs are emergencies.
- Reorg handling should be based on depth, frequency, persistence, checkpoint proximity, and state-confidence impact.

---

## Severity dimensions

Every reorg should be evaluated on at least these dimensions:

- **depth** — how many blocks are displaced
- **frequency** — how often reorgs occur in a recent window
- **persistence** — whether nodes quickly reconverge
- **checkpoint proximity** — whether accepted checkpoint posture is threatened
- **state confidence impact** — whether the reorg suggests invalid/corrupt state risk
- **validator convergence** — whether validators stay aligned

---

## Suggested severity tiers

### Tier R0 — Incidental

Typical shape:

- zero or one tiny reorg
- depth is shallow
- quick reconvergence
- no checkpoint concern
- no evidence of invalid state

Operator action:

- observe only
- log it
- do not escalate

### Tier R1 — Noisy

Typical shape:

- repeated shallow reorgs
- noticeable branch churn
- still no accepted checkpoint dispute
- no clear evidence of invalid/corrupt state
- convergence still happens, but not cleanly

Operator action:

- increase monitoring
- alert operators
- start collecting reorg evidence bundle
- warn validators if pattern continues

### Tier R2 — Serious divergence

Typical shape:

- medium-depth reorgs
- sustained branch competition
- repeated failure to cleanly reconverge
- checkpoint posture becoming uncertain
- operator confidence in canonical continuity reduced

Operator action:

- enter incident-watch posture
- stop assuming live tip is automatically safe
- gather full evidence bundle
- prepare validator guidance
- prepare canonical branch statement if needed

### Tier R3 — Emergency

Typical shape:

- deep reorg
- accepted checkpoint challenged or crossed
- honest nodes disagree on canonical path
- repeated or persistent failure to converge
- invalid/corrupt state concerns cannot be ruled out

Operator action:

- treat as incident
- halt assumptions
- coordinate validator/operator response
- decide canonical recovery path
- consider rollback / coordinated fork only if correctness requires it

---

## Threshold framing

Mainnet-0 should eventually convert these qualitative tiers into measured thresholds, but until then the practical guidance is:

### Shallow reorg
- small enough that it does not meaningfully threaten checkpoint confidence or operator trust in state continuity

### Medium reorg
- large enough to require active attention and evidence collection
- no longer safe to dismiss as harmless background noise

### Deep reorg
- large enough that operators should assume correctness/canonical continuity may be threatened
- especially severe if it approaches or crosses accepted checkpoint posture

---

## Frequency posture

Even shallow reorgs can become serious if they happen too often.

Operators should care about:

- repeated shallow reorgs in a short window
- repeated branch churn with no stable reconvergence
- repeated divergence clustered around checkpoint-relevant heights

A chain that only ever has shallow reorgs can still be unhealthy if the frequency is high enough.

---

## Checkpoint interaction

Reorgs should always be interpreted relative to checkpoint posture.

- reorg before any accepted checkpoint may be concerning or serious depending on context
- reorg near an accepted checkpoint is more serious
- reorg that crosses an accepted checkpoint is emergency territory by default

Checkpoint-crossing reorgs should not be treated as ordinary early-network noise.

---

## Validator expectations

Validators should:

- monitor reorg frequency and depth
- report sustained divergence early
- not casually follow unstable branch churn near checkpoint-sensitive territory
- treat Tier R2/R3 conditions as operator-coordination territory

Validators should not:

- normalize repeated medium/deep reorgs
- treat checkpoint-crossing reorgs as casual variance
- assume continued block production means canonical safety

---

## Required follow-up measurements

Mainnet-0 should eventually measure and record:

- observed reorg depth
- observed reorg frequency
- checkpoint-related incidents
- convergence time after divergence
- validator drift during reorg events

---

## Current intent summary

Current Mainnet-0 reorg severity intent is:

- shallow incidental reorgs may be tolerated
- repeated shallow reorgs deserve monitoring
- medium persistent reorgs require incident-watch posture
- deep or checkpoint-crossing reorgs are emergency territory
