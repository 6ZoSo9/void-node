# Epoch-2 production validator runtime evidence import v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1`

Status: source-ready single-validator import lane.

## Purpose

Import one exact real-machine runtime evidence file while it is fresh and bind
that file to:

- its exact SHA-256;
- its exact `voide2ve1_<sha256>` evidence ID;
- its canonical machine role;
- its canonical VOID node ID / Besu validator address; and
- the exact UTC time at which the evidence was independently revalidated.

Canonical roles are:

- Precision
- Nimo
- Xiphos

## Why import one machine at a time

Each machine-generated evidence row has a bounded validity window. Requiring all
three machines to finish inside one shared window would create an unnecessary
operational race.

The import receipt therefore records the exact `import_evaluated_at_utc` at
which the row was still valid. Final three-validator promotion later replays the
same semantic verification at that recorded import time.

## Canonical files

For role `<role>`:

```text
ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-<role>-v1.json
ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-<role>-import-v1.json
```

The evidence file must be the exact bytes produced by the real-machine runner.

## Import behavior

The importer rejects:

- an unknown role;
- evidence bytes whose SHA-256 does not equal the caller-pinned SHA;
- an evidence ID that is not caller-pinned exactly;
- a role mismatch;
- stale evidence at the supplied evaluation time;
- any mismatch against the canonical QBFT binding;
- any plugin/client/Chain-2050 mismatch;
- any missing plugin/rejection/fail-closed claim; and
- any authority flag that is not false.

A successful single-host import may set only:

```text
this_validator_runtime_evidence_imported=true
this_validator_runtime_evidence_semantically_verified=true
evidence_fresh_at_import=true
```

It must retain:

```text
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

## Authority

Source import only. No service action, validator mutation, RPC, private-key or
wallet access, transaction construction/signing/submission/broadcast,
authoritative Chain-2050 write, token/funds movement, migration, or activation.
