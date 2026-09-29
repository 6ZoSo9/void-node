# Epoch-2 replay runtime import and cross-epoch protection promotion v1

Status: **source importer/promoter green; real Precision evidence import pending**.

## Purpose

This lane consumes the fresh inactive Precision replay-binding runtime evidence
and separates two operations:

1. import and verify the runtime evidence; then
2. promote the production replay binding and the complete cross-epoch replay
   wall only if every canonical prerequisite remains green.

The import receipt does not move any gate by itself.

## Runtime evidence import

The importer requires:

- the exact evidence-file SHA-256;
- the exact `voide2gre1_...` evidence ID;
- recomputation of the evidence ID from canonical material;
- Precision hostname and exact user-service identity;
- the exact production replay root;
- service/operator/replay-root UID equality;
- replay-root mode `0700`;
- AF_UNIX-only service hardening;
- verified/preserved preexisting replay receipts;
- an exact marker delta of `before + 1`;
- a fresh canary digest consumption;
- replay rejection after reopening the binding; and
- evidence freshness at import.

The receipt keeps:

```text
production_gateway_replay_store_binding_verified=false
cross_epoch_replay_protection_proven=false
runtime_route_active=false
public_submission_open=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

## Cross-epoch promotion prerequisites

Promotion re-verifies the imported evidence at its recorded import time and also
requires all of the existing replay prerequisites:

```text
legacy_write_rpc_disabled_before_successor_activation=true
execution_epoch_bound_in_public_gateway=true
privileged_signer_nonce_or_key_replay_fence_proven=true
pending_legacy_signed_transaction_census_complete=true
raw_transaction_epoch_domain_defined=true
raw_transaction_epoch_domain_source_proven=true
besu_transaction_validation_rule_implemented=true
plugin_artifact_content_addressed=true
plugin_artifact_runtime_identity_verified=true
besu_transaction_validation_rule_runtime_proven=true
all_production_validators_epoch_domain_enforced=true
```

Only after all of those predicates and the fresh production replay-binding
evidence verify may the promotion set:

```text
production_gateway_replay_store_binding_verified=true
cross_epoch_replay_protection_proven=true
```

## Inactive-route boundary

Cross-epoch replay protection is a pre-activation safety property. It does not
require opening the public route.

Promotion therefore must retain:

```text
runtime_route_active=false
public_submission_open=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

The migration classifier must no longer report
`cross_epoch_replay_protection_required`, but the migration remains HOLD for
all unrelated missing gates.

## Canonical paths

Real runtime evidence:

```text
ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.json
```

Import receipt:

```text
ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.json
```

Promotion:

```text
ops/mainnet0/economic-epoch2-cross-epoch-replay-protection-promotion-v1.json
```

## Source proof

```bash
node scripts/prove_void_economic_epoch2_replay_runtime_import_promotion_v1.mjs
```

The proof is synthetic and performs no service action, RPC call, wallet/private
key access, transaction submission/broadcast, Chain-2050 write, validator
mutation, token movement, funds movement, migration, or public activation.
