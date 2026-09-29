# Epoch-2 production validator runtime publication v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1`

Status: source-ready canonical publication verifier for one validator at a time.

## Purpose

A real machine produces two public artifacts:

```text
economic-epoch2-production-validator-runtime-evidence-<role>-v1.json
economic-epoch2-production-validator-runtime-evidence-<role>-import-v1.json
```

where `<role>` is exactly `precision`, `nimo`, or `xiphos`.

This lane allows those artifacts to enter repository truth independently rather
than forcing all three machines to finish inside one short evidence-validity
window.

## Verification

For each published pair, the verifier:

1. requires the exact canonical role and canonical repository paths;
2. re-hashes the evidence bytes;
3. replays the single-validator semantic import using the import receipt's
   recorded evaluation time;
4. requires the reconstructed receipt to equal the published receipt exactly;
5. requires the evidence hash, evidence ID, role, canonical binding, and
   freshness-at-import claims to match; and
6. keeps fleet-wide enforcement, cross-epoch replay protection, migration,
   activation, and funds authority false.

The private Besu node key is never part of this publication.

## Canonical paths

For role `<role>`:

```text
ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-<role>-v1.json
ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-<role>-import-v1.json
```

## Final promotion

After all three role pairs are present and individually verified, the existing
three-host promotion tool may consume them and advance:

```text
all_production_validators_epoch_domain_enforced=true
```

while still retaining:

```text
cross_epoch_replay_protection_proven=false
production_validator_set_bound=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

## Authority

Source verification only. No service action, RPC, private-key access, validator
mutation, transaction, authoritative Chain-2050 write, token/funds movement,
migration, or public activation.
