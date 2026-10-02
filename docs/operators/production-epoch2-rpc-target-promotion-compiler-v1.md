# Production Epoch-2 RPC target promotion compiler v1

Marker: `VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_COMPILER_V1`

Preview marker:
`VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_PREVIEW_V1`

## Purpose

This source-only compiler validates the structural consistency of the evidence
bundle that would be required for a future production Chain-2050 Epoch-2 RPC
selection.

It does **not** select a production RPC target and does not emit a selected-state
descriptor from serialized caller-supplied evidence.

The canonical target remains HOLD until a separately reviewed apply lane either:

1. re-runs/rebinds the live production host observer immediately before canonical
   mutation; or
2. consumes an in-process, module-private capability-bound observation produced by
   that observer.

This compiler does not edit
`ops/mainnet0/production-epoch2-rpc-target-v1.json`.

## Inputs

The compiler consumes three exact serialized evidence artifacts:

1. the private-QBFT activation plan;
2. the green private-QBFT activation receipt; and
3. a production host/RPC observation receipt.

Each artifact is supplied with an independent SHA-256 value. Exact bytes and
content IDs are checked before structural evaluation.

## What the serialized checks prove

Activation lineage is revalidated through
`validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(...)`.

The serialized host observation must remain content-addressed by its
`voidpe2rpcobs1_<sha256>` ID and must be internally consistent with:

- canonical-main-shaped source binding;
- the exact reviewed Precision `18553` / service identity;
- the supplied activation plan and receipt IDs/digests;
- exact reviewed successor genesis and validator bindings;
- at least two peers and the expected validator set;
- head at or above the activation floor;
- the observation's claimed `write_capable_not_authorized` classification; and
- no transaction, migration, presale, funds, or target-promotion authority.

These checks prove which JSON was supplied and whether that JSON is structurally
consistent. They do **not** prove that the claimed live observation actually
occurred.

## Output boundary

A green compile emits only:

```text
marker=VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_PREVIEW_V1
status=PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_PREVIEW_STRUCTURALLY_VERIFIED_NOT_LIVE_BOUND
production_rpc_target_selected=false
runtime_active_verified=false
independent_host_acceptance=false
live_observer_reexecuted=false
selected_descriptor_emitted=false
```

The preview is content-addressed by
`voidpe2rpcprompreview1_<sha256>`.

It may record the proposed reviewed RPC URL/service plus the pinned activation
and serialized-observation IDs/digests, but those facts remain proposal/evidence
metadata rather than production selection authority.

The legacy exported
`buildProductionEpoch2RpcSelectedDescriptorV1(...)` entrypoint now fails closed
with:

`production_epoch2_rpc_selected_descriptor_requires_live_revalidated_apply`

so existing callers cannot silently retain the old authority-bearing behavior.

## Live usage

```bash
node tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs \
  --activation-plan /absolute/activation-plan.json \
  --activation-plan-sha256 <64hex> \
  --activation-receipt /absolute/activation-receipt.json \
  --activation-receipt-sha256 <64hex> \
  --runtime-observation /absolute/production-rpc-observation.json \
  --runtime-observation-sha256 <64hex> \
  --output /absolute/outside-repo/production-rpc-promotion-preview.json
```

The compiler itself makes no RPC call and performs no service or Docker action.

## Verification

```bash
node --check tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs
node --check scripts/prove_void_production_epoch2_rpc_target_promotion_compiler_v1.mjs
node scripts/prove_void_production_epoch2_rpc_target_promotion_compiler_v1.mjs
```

The proof intentionally uses a fully synthetic but structurally self-consistent
host-observation fixture. That fixture must now produce only a preview. It must
never produce `production_rpc_target_selected=true`,
`runtime_active_verified=true`, or `independent_host_acceptance=true` as
compiler authority.

The proof also retains rejection coverage for observation-ID drift,
activation-plan digest drift, alternate RPC, missing claimed acceptance,
forged promotion authority, authority escalation, and malformed evidence hashes.

## Authority boundary

```text
source_preview_only=true
source_candidate_only=false
structural_evidence_only=true
selected_target_authority=false
live_observer_reexecution=false
canonical_target_write=false
rpc_call=false
service_action=false
docker_mutation=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
validator_mutation=false
migration_authorized=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

## Next gate

Use the preview to review evidence shape and lineage only.

The separate evidence-aware canonical apply lane must establish fresh live
observer authority immediately before any selected descriptor is created or the
canonical HOLD descriptor is changed. Serialized observation JSON by itself is
never sufficient for that gate.
