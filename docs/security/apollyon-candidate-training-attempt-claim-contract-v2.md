# Apollyon candidate-training attempt claim contract v2

Marker: `VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2`

Status: **pure source-only contract; no durable claim and no training**.

## Purpose

V1 claim-contract semantics bound an authorization custody record to historical
V84/V1 live custody evidence. That live generation is no longer current
authority.

V2 instead requires the exact current-V2 preclaim produced by #3037 and binds it
to the exact immutable custody assertion/record for one candidate-training
authorization.

## Inputs

The contract accepts exactly:

1. a `VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2` result;
2. a successful V80 custody assertion; and
3. the exact V80 custody record whose canonical SHA-256 equals the assertion.

The custody record carries the authorization ID, operator-public-key
fingerprint, request identity, canonical source commit/tree, corpus identity and
parent-adapter identity.

The current-V2 preclaim carries the exact Xiphos boot digest, training PID,
process start-time ticks, installed-isolation receipt identity and current V2
live qualification identity.

## Historical authority rejection

A V84/V1 live receipt is not an accepted input and cannot satisfy this contract.

```text
historical_v84_v1_sufficient=false
```

The V1 module is imported only for its canonical custody-record JSON function;
its V1 live-qualification validator is not invoked.

## Output boundary

A successful result is still unclaimed:

```text
live_service_source_identity_proven=false
same_live_custody_session_binding_proven=false
durable_attempt_claim_performed=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

The next gate remains:

`live_custody_service_source_identity_binding_v2`

That live gate must prove that the exact custody assertion and record were read
from one stable live reviewed custody service/session while the current-V2
training-process generation remains bound.

This source has no filesystem, network, process, service, key, signing, wallet,
transaction or funds authority.
