# Mainnet-0 Operator Incident Bundle

Status: design-lock note for the minimum evidence bundle operators should collect during divergence/reorg/invalid-state incidents

## Purpose

This note defines the minimum evidence bundle operators should gather before making strong claims about canonical failure, invalid state, or required coordinated recovery.

The goal is to prevent sloppy incident handling and force evidence-first response.

---

## Minimum incident bundle

At minimum, operators should gather:

### Chain position
- local head height/hash
- peer/main head height/hash
- disputed block height/hash
- parent block height/hash

### Reorg / divergence evidence
- observed reorg depth
- whether divergence persists or reconverges
- whether accepted checkpoint posture is threatened
- whether issue crosses accepted checkpoint

### State / correctness evidence
- txroot/header/body consistency evidence if relevant
- persisted-state evidence if relevant
- whether invalid/corrupt state is merely suspected or actually reproduced
- whether issue reproduces on more than one honest node

### Validator evidence
- which validators appear on which branch
- whether validators are converging
- whether any validator appears stuck on a bad/disfavored path
- whether validator disagreement appears to be config-related or correctness-related

### Health / drift evidence
- ready/health state
- peer-main status
- drift measurements
- any checkpoint/finality alerts or related operator observations

---

## Strong claims require evidence

Operators should not casually claim any of the following without evidence bundle support:

- “the chain is wrong”
- “this branch is invalid”
- “we need a rollback”
- “we need a coordinated fork”
- “the checkpoint is contaminated”

---

## Incident bundle quality rules

Evidence bundle should be:

- timestamped
- tied to exact heights/hashes
- compared across more than one honest node when possible
- explicit about what is known versus suspected
- explicit about whether checkpoint posture is affected

---

## Bundle classification tags

Every bundle should try to classify the incident as one of:

- local anomaly
- noisy reorg
- sustained divergence
- bad-block suspicion
- invalid-state suspicion
- checkpoint challenge
- canonical safety failure

---

## Operator response after bundle collection

Once bundle is collected, operators should decide:

- observe only
- warning / increased monitoring
- incident-watch posture
- coordinated validator response
- canonical recovery / rollback / coordinated fork guidance

---

## Validator communication payload

If validators need guidance, the operator payload should include:

- disputed height/hash
- intended canonical posture
- whether validators should pause, reject, or continue
- whether checkpoint posture changed
- whether recovery guidance is temporary or canonical

---

## Current intent summary

Current Mainnet-0 incident-bundle intent is:

- no strong claims without evidence
- no rollback/fork claims without explicit bundle support
- no checkpoint contamination claims without checkpoint-aware evidence
- evidence first, policy second, action third
