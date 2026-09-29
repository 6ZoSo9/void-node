# Economic Epoch-2 cross-epoch replay closure v1

Marker:

`VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1`

Status: source-only closure classifier. It does not promote the canonical
`cross_epoch_replay_protection_proven` gate.

## Purpose

The Epoch-2 replay wall is now composed from several independently reviewed
protections:

- legacy write RPC disabled before successor activation;
- execution epoch bound in the public signed-submission gateway;
- privileged successor signer nonce/key replay fence;
- complete controlled-store legacy signed-transaction census;
- raw Chain-2050 transaction epoch-domain source contract;
- content-addressed Besu validator plugin;
- plugin runtime identity and rule behavior proof;
- durable signed-submission replay store source;
- production gateway replay-store source binding; and
- exact three-validator QBFT production identity set.

These protections previously lived in separate lanes. This classifier makes the
remaining live gap explicit without manufacturing a replay-green claim.

## Canonical current result

With the checked-in canonical artifacts, the classifier returns:

```text
status=SOURCE_CLOSURE_READY_LIVE_RUNTIME_HOLD
source_prerequisites_verified=true
cross_epoch_replay_protection_proven=false
```

and exactly two remaining live gates:

1. `all_production_validators_epoch_domain_enforced`
2. `production_gateway_replay_store_binding_verified`

The first requires real fresh Precision, Nimo, and Xiphos runtime evidence to
pass the existing importer/promotion mechanism.

The second requires a later production replay-root/service-identity/custody
runtime binding. The existing source gateway replay-binding artifact deliberately
keeps that live field false.

## No bare-boolean promotion

This classifier is deliberately non-authoritative.

If supplied artifacts merely report both live fields as true, it returns:

`PROMOTION_INPUTS_PRESENT_UPSTREAM_LIVE_EVIDENCE_REVALIDATION_REQUIRED`

and still keeps:

```text
upstream_live_evidence_semantically_verified=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

A later promotion lane must independently revalidate the real upstream live
artifacts before canonical replay protection can advance.

This prevents the same class of false-green error where a checked-in boolean is
treated as equivalent to its evidence.

## QBFT identity boundary

The classifier also binds the exact current production QBFT identity set:

- Precision
- Nimo
- Xiphos

with exactly three unique VOID node IDs and Besu validator addresses.

This does not set `production_validator_set_bound=true`; it only ensures the
replay closure references the same current production identity set used by the
runtime-evidence importer.

## Authority boundary

Pure source classification only.

No filesystem mutation, service action, production RPC, validator mutation,
wallet/private-key/credential access, transaction
construction/signing/submission/broadcast, Chain-2050 write, token/funds
movement, migration, or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_cross_epoch_replay_closure_v1.mjs
```
