# Epoch-2 production validator runtime evidence importer v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1`

Status: **source-only semantic importer for three real-machine disposable runtime bundles; production-service enforcement remains HOLD**.

## Purpose

The per-host collector already produces one short-lived
`voide2ve1_<sha256>` candidate for each canonical production-validator role:

- Precision
- Nimo
- Xiphos

Those candidate rows are intentionally non-authoritative by themselves.
`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1` validates
their topology, identity, freshness, plugin identity, and content-addressed row
IDs, but deliberately reports:

```text
upstream_runtime_evidence_semantically_verified=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
```

This importer closes only the first of those gaps.

## Imported bundle

Each role bundle contains the exact text bytes for:

- disposable Besu runtime-result JSON;
- machine-local runtime-facts JSON;
- canonical public QBFT identity attestation JSON;
- Besu log text;
- the canonical plugin JAR SHA-256; and
- the resulting runtime-evidence candidate row.

The importer independently:

1. hashes the exact runtime/facts/log bytes;
2. binds the public identity JSON to its pinned Git blob;
3. binds the private-attestation SHA carried by that public identity to the
   current canonical QBFT binding entry;
4. checks the canonical hostname, VOID node ID, Besu public key/address, private
   node-key path suffix and file mode declarations;
5. checks that private-key content was not exported or printed;
6. checks loopback VOID health, pinned Besu image, exact plugin SHA, plugin
   registration, transaction-rule registration, unmarked-transaction rejection,
   loopback-only RPC, no external P2P exposure, fail-closed plugin startup, and
   zero production RPC/write/funds authority;
7. requires the Besu log itself to contain plugin and transaction-rule
   registration lines;
8. reconstructs the exact `voide2ve1_<sha256>` row rather than trusting the
   supplied row; and
9. passes all three reconstructed rows through the canonical fleet enforcement
   verifier at one evaluation timestamp.

All three roles are mandatory and ordered exactly
`precision,nimo,xiphos`.

## What becomes true

A successful import may report:

```text
upstream_runtime_evidence_semantically_verified=true
disposable_runtime_identity_bound=true
```

It also publishes content digests for the imported runtime-result, facts,
identity-attestation, and Besu-log material.

## Deliberate production boundary

The machine-local runner starts only a disposable isolated Besu container. It
does **not** prove that the actual production validator service is configured
with or currently running the plugin.

Therefore this importer deliberately keeps:

```text
production_service_configuration_verified=false
production_service_runtime_plugin_enforcement_verified=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

The next gate needs read-only evidence from the actual production service
configuration/runtime on each canonical validator, not another disposable test.

## Authority boundary

The exported importer is pure source verification. It performs no filesystem
read/write, credential/private-key access, wallet access, RPC, transaction
construction/signing/submission/broadcast, Chain-2050 write, validator mutation,
migration, activation, or funds movement.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_validator_runtime_import_v1.mjs
```
