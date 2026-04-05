# Mainnet-0 Checkpoint and Finality Policy

Status: design-lock note for Mainnet-0 checkpoint acceptance, reorg severity, and operator response

## Purpose

This note defines the intended checkpoint/finality posture for Mainnet-0.

Mainnet-0 is a real canonical network, but it is still an early network. Finality is therefore a mix of technical behavior and explicit operator/validator policy.

The goal is to make checkpoint handling explicit, so operators know when to:

- observe only
- warn validators
- stop following a bad path
- coordinate a canonical recovery

---

## Core posture

- Mainnet-0 should have explicit accepted checkpoints.
- Reorgs before an accepted checkpoint may be tolerable depending on depth and cause.
- Reorgs that challenge or invalidate an accepted checkpoint are emergency territory.
- Correctness is more important than pretending every live branch is acceptable.
- Checkpoint acceptance should reduce ambiguity, not create false certainty.

---

## Definitions

### Checkpoint

A checkpoint is a block height (and corresponding canonical block/state expectation) that operators treat as especially important for network continuity and recovery decisions.

### Accepted checkpoint

An accepted checkpoint is a checkpoint that operators regard as canonical enough that any serious dispute past it requires incident handling rather than casual branch following.

### Finality posture

Finality posture is the practical rule for how much reorg risk is considered normal, concerning, or unacceptable at Mainnet-0.

### Emergency territory

Emergency territory begins when a divergence or reorg is deep enough, persistent enough, or close enough to accepted checkpoints that operators must stop treating it as ordinary network variance.

---

## Checkpoint posture

Mainnet-0 should maintain a simple explicit checkpoint posture.

### Expected behavior

- operators track important checkpoint heights
- validators are aware of current accepted checkpoint posture
- nodes may still see short-term variance before checkpoints are considered accepted
- checkpoints are used to reduce ambiguity during incidents

### Initial policy intent

Until stricter rules are implemented, Mainnet-0 should treat checkpoints as operator-recognized canonical reference points rather than pretending instant hard finality exists.

---

## Reorg severity tiers

### Tier 0 — Normal variance

Examples:

- no reorg
- tiny short-lived branch variance
- no checkpoint challenge
- no state inconsistency observed

Operator action:

- observe
- continue monitoring

### Tier 1 — Concerning but not emergency

Examples:

- repeated short reorgs
- unusual branch churn
- validator drift without checkpoint dispute
- signs of instability, but accepted checkpoint not challenged

Operator action:

- warn operators/validators
- increase monitoring
- prepare incident bundle

### Tier 2 — Serious divergence

Examples:

- sustained multi-block divergence
- repeated medium-depth reorgs
- validators not converging
- branch uncertainty approaching accepted checkpoint territory

Operator action:

- stop assuming the live branch is automatically fine
- collect checkpoint/head/state evidence
- prepare canonical response guidance

### Tier 3 — Emergency territory

Examples:

- accepted checkpoint is disputed
- reorg crosses accepted checkpoint
- invalid/corrupt state is accepted past checkpoint
- honest nodes disagree on canonical state near or after checkpoint
- persistent split threatens canonical continuity

Operator action:

- treat as correctness incident
- freeze assumptions
- coordinate validator/operator response
- declare canonical recovery path if needed

---

## Accepted checkpoint policy

A checkpoint should only be treated as accepted when operators have enough confidence that continuing past it on the intended canonical path is the correct behavior.

Accepted checkpoint status should consider:

- validator convergence
- chain health around the checkpoint
- absence of known invalid state transitions
- absence of unresolved branch disputes
- operator awareness of the accepted checkpoint

---

## Reorg policy relative to checkpoints

### Reorg before accepted checkpoint

May be tolerated depending on:

- depth
- frequency
- whether state remains consistent
- whether honest nodes reconverge quickly

### Reorg at or beyond accepted checkpoint

Should be treated as emergency territory unless clearly shown to be harmless and fully understood.

The default Mainnet-0 posture should be:

- challenge to accepted checkpoint = incident
- deep reorg past accepted checkpoint = incident
- unresolved branch split near accepted checkpoint = incident

---

## Operator response sequence

When checkpoint/finality issues are detected:

1. Gather facts
   - current head
   - checkpoint height
   - local vs peer state
   - validator observations
   - drift/reorg evidence

2. Classify severity
   - Tier 0
   - Tier 1
   - Tier 2
   - Tier 3

3. Decide posture
   - continue observing
   - issue warning
   - stop following uncertain branch
   - coordinate canonical recovery

4. Communicate
   - current checkpoint in question
   - intended canonical path
   - validator instructions
   - whether any halt/restart/config action is required

---

## Validator expectations around checkpoints

Validators should:

- monitor accepted checkpoint posture
- avoid casually following uncertain branch behavior near accepted checkpoints
- escalate severe divergence quickly
- follow declared canonical recovery guidance during incident handling

Validators should not:

- normalize deep checkpoint-crossing reorgs
- continue on a clearly disfavored path after canonical policy is declared
- assume “still producing blocks” means “everything is fine”

---

## What counts as unacceptable

The following should be treated as unacceptable Mainnet-0 behavior:

- repeated deep reorgs with no operator escalation
- accepted checkpoint dispute treated as ordinary variance
- checkpoint-crossing reorg accepted casually
- invalid/corrupt state surviving past accepted checkpoint without incident handling
- persistent split with no canonical response guidance

---

## Required tracked artifacts

Mainnet-0 checkpoint/finality posture should eventually be reflected in:

- checkpoint/finality policy note
- checkpoint incident checklist
- validator response/runbook
- reorg severity thresholds
- sanity/proof script for policy artifact presence

---

## Current intent summary

Current Mainnet-0 checkpoint/finality intent is:

- checkpoints matter
- accepted checkpoints reduce ambiguity
- deep or checkpoint-crossing reorgs are emergency territory
- correctness beats passive acceptance of bad chain behavior
- operator response must be explicit when checkpoint safety is challenged
