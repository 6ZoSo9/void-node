# Apollyon candidate-training attempt claim contract v1

Marker: `VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V1`

Status: **pure source-only claim contract; no claim executor**.

## Purpose

V85 defines the exact evidence bundle a later durable attempt-claim executor must
accept. It does not create an attempt claim and cannot execute training.

The contract requires all three inputs:

1. an exact successful V84 live Xiphos custody qualification;
2. an exact V80 custody assertion for one authorization; and
3. the exact immutable V80 custody record whose canonical SHA-256 matches that assertion.

The custody record binds the authorization ID, operator fingerprint, request,
canonical source commit/tree, corpus, parent adapter, target host and action.

## Source pins

V85 is authored against:

```text
V84 live qualification tool 3dae4db82a9316eaa88f475cec41ddc05a441536
V80 custody core            f9f18db5bbfeea466202ef0d7babe08c3c401d66
```

V84 itself pins V83 and V82 and proves the designated Xiphos custody boundary.

## Deliberate missing binding

A pure function can verify the V84 receipt and the custody assertion/record, but
it cannot prove that the assertion was fetched from the exact same currently
qualified live custody service instance.

V85 therefore sets:

```text
same_live_custody_session_binding_required=true
same_live_custody_session_binding_proven=false
durable_attempt_claim_required=true
durable_attempt_claim_performed=false
attempt_claim_authorized=false
attempt_claimed=false
```

The later live executor must establish that missing binding while holding the
reviewed custody channel/namespace and must durably publish the attempt claim
before any trainer can run.

## Output

A successful V85 result is a deterministic `claim_contract_qualified_unclaimed`
record and `apollyon_claim_contract_v1:<sha256>` identity. It carries the exact
request/corpus/source/adapter identities forward but grants no execution power.

## Forbidden authority

V85 has no filesystem, network, service-control, private-key, signing, wallet,
transaction, funds, attempt-claim, training or candidate-weight mutation code.

## Next gate

`durable_candidate_training_attempt_claim_executor_v1`
