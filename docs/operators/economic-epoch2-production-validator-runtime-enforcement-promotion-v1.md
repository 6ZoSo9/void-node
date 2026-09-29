# Epoch-2 production validator runtime enforcement promotion v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1`

Status: source-ready final three-validator enforcement promotion.

## Preconditions

All three canonical validators must have:

1. an exact canonical runtime evidence JSON file; and
2. a canonical single-validator import receipt proving that file was fresh and
   semantically valid at import time.

Roles are fixed to:

```text
precision
nimo
xiphos
```

The promotion re-hashes every evidence file, checks every evidence ID/import
receipt, and requires one explicit common promotion evaluation timestamp.
Every runtime row is re-run through the single-row semantic verifier at that
same promotion timestamp. Fresh-at-import evidence that has expired by the
promotion instant fails closed.

## Gate movement

When all three imports are valid and all three runtime rows remain fresh at
the same promotion evaluation timestamp, the promotion may advance:

```text
upstream_runtime_evidence_semantically_verified=true
all_three_runtime_rows_fresh_at_common_promotion_time=true
all_production_validators_epoch_domain_enforced=true
```

It updates the generated raw-domain policy bundle and generated successor
migration candidate accordingly.

## Explicit remaining HOLD

This promotion deliberately does **not** claim the full cross-epoch wall is
closed:

```text
cross_epoch_replay_protection_proven=false
production_validator_set_bound=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

The proof runs the successor migration classifier and requires:

- `production_validator_epoch_domain_enforcement_required` is no longer a
  missing gate; and
- `cross_epoch_replay_protection_required` remains a missing gate.

This prevents production-validator enforcement from being conflated with the
separate signed-submission/gateway replay boundary.

The promotion artifact records `promotion_evaluated_at_utc`, and every
validator row records the same value alongside its original
`import_evaluated_at_utc`. This preserves evidence lineage without confusing
historical import freshness with fleet-wide live promotion freshness.

CLI use requires:

```bash
--promotion-evaluated-at-utc <YYYY-MM-DDTHH:MM:SSZ>
```

## Authority

Source promotion only. No runtime/service mutation, RPC, validator mutation,
key/wallet access, transaction, Chain-2050 write, token/funds movement,
migration, or public activation.
