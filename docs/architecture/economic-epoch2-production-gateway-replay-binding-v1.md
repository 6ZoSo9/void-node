# Economic Epoch-2 production gateway replay binding v1

Marker: `VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1`

Status: **source composition green; live production binding HOLD**.

## Purpose

The Epoch-2 public submission gateway requires an atomic replay decision, and
the durable replay-store lane now provides a concrete filesystem-backed
implementation. This binding layer removes the remaining source-level adapter
ambiguity by constructing that exact durable store internally and injecting it
into the exact gateway core.

The caller cannot supply a different replay adapter through this binding.

## Composition

The binding uses:

- `tools/void-economic-epoch2-public-submission-gateway-v1.mjs`;
- `tools/void-economic-epoch2-durable-replay-store-v1.mjs`; and
- `tools/void-economic-epoch2-production-gateway-replay-binding-v1.mjs`.

The durable store is created once from the supplied replay root. The resulting
binding exposes only the gateway admission surface and injects the concrete
store internally.

All other gateway inputs remain explicit and independently reviewed:

- signed intent;
- calldata;
- signature;
- trusted clock;
- replay-consume timeout; and
- target allowlist.

This lane does not select a production target allowlist, clock source, service
identity, or replay-root path.

## Restart / replay proof

The source proof creates an owner-private temporary replay root and:

1. admits one signed Epoch-2 intent through the binding;
2. proves the concrete durable store consumed the signed digest;
3. creates a fresh binding instance over the same root;
4. proves the same signed intent is rejected as replay;
5. deletes the audit receipt;
6. creates another fresh binding instance; and
7. proves the digest remains consumed because the create-once marker directory,
   not the receipt, is replay authority.

A replay-root symlink is also rejected by the underlying durable store.

## Gate meaning

This lane may establish:

```text
durable_replay_store_implemented=true
durable_replay_store_verified=true
production_gateway_replay_store_binding_source_verified=true
```

It deliberately does **not** establish:

```text
production_gateway_replay_store_binding_verified=true
runtime_route_active=true
public_submission_open=true
transaction_submission=true
transaction_broadcast=true
authoritative_chain2050_write=true
cross_epoch_replay_protection_proven=true
migration_authorized=true
public_activation_authorized=true
```

The live production-binding gate still requires an exact production replay
root, service identity, same-UID trust or stronger namespace custody, and
runtime evidence from the deployed inactive gateway before route activation.

## Threat model

The durable store currently uses path-based marker creation because Node does
not expose the required fd-relative `mkdirat` primitive in this module. The
live production binding must therefore prove a compliant same-UID process model
or stronger namespace custody before promotion.

This source layer does not close a hostile same-UID namespace-replacement race.

## Authority

The proof mutates only fresh temporary test directories. It performs no RPC,
wallet/private-key access, production store mutation, transaction
construction/signing/submission/broadcast, authoritative Chain-2050 write,
validator mutation, token movement, funds movement, migration, or public
activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_gateway_replay_binding_v1.mjs
```
