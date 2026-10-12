# Epoch-2 production validator runtime freshness requalification v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1`

Status: source-ready read-only freshness requalification lane.

## Purpose

Revalidate a newly captured three-machine validator runtime evidence set after the
canonical production-validator enforcement promotion has already been committed.

This lane does not replay or replace the original promotion. It verifies that
fresh Precision, Nimo, and Xiphos evidence still matches the canonical validator
binding and was simultaneously valid at a caller-pinned UTC evaluation time.

## Verification model

The verifier:

1. requires the existing committed validator promotion to remain valid;
2. requires the current raw-domain policy to retain the promoted validator gate;
3. reconstructs the historical pre-promotion validator-verifier state in memory;
4. hashes and ID-checks all three caller-pinned evidence files;
5. requires one shared validity interval containing the evaluation time;
6. reruns the canonical three-validator semantic verifier; and
7. confirms the fresh validator addresses still match the committed promotion.

The reconstructed state is verification-only and is never written to disk.

## Gate semantics

A successful requalification may report:

```text
all_production_validators_epoch_domain_enforced_requalified=true
validator_runtime_fresh_at_evaluation_time=true
```

It deliberately does not claim that the fresh validator rows independently
requalified later replay layers:

```text
cross_epoch_replay_protection_requalified=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

Existing canonical replay state is observed but not mutated or re-promoted.

## Authority

Source verification only. No repository mutation, service action, validator
mutation, RPC, key or wallet access, transaction construction/signing/submission
or broadcast, authoritative Chain-2050 write, token/funds movement, migration,
or public activation.
