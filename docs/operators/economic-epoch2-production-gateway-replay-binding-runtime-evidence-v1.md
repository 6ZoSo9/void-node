# Epoch-2 production gateway replay-binding runtime evidence v1

Marker: `VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_CONTRACT_V1`

Status: **source package green; Precision deployment/runtime evidence HOLD**.

## Purpose

The source-only production gateway replay binding already composes the exact
Epoch-2 signed-submission gateway with the exact durable replay store. The
remaining production-binding gate is runtime evidence from an inactive deployed
gateway.

This package binds that evidence to Precision without opening submission or
creating any Chain-2050 write path.

## Selected production boundary

The runtime package selects:

- host: `zoso-Precision-Tower-7810`;
- user service:
  `void-economic-epoch2-public-submission-gateway-v1.service`;
- state directory:
  `~/.local/state/void-economic-epoch2-public-submission-gateway-v1`;
- replay root:
  `~/.local/state/void-economic-epoch2-public-submission-gateway-v1/replay-v1`;
- runtime status:
  `~/.local/state/void-economic-epoch2-public-submission-gateway-v1/status-v1.json`.

The replay root must be a real owner-private directory with mode `0700`.
The operator UID, service UID, and replay-root owner UID must be identical.

## Inactive service

The service loads
`createVoidEconomicEpoch2ProductionGatewayReplayBindingV1` against the exact
production replay root and then remains inactive.

It exposes no HTTP listener and no submission route. The unit is restricted to
`AF_UNIX`, uses `NoNewPrivileges=true`, `ProtectSystem=strict`,
`ProtectHome=read-only`, `UMask=0077`, and grants write access only to the
dedicated state directory.

Installation does not start the service by default.

## Runtime canary

The evidence collector performs one bounded local replay canary after the
inactive service is already active.

The canary:

1. creates one ephemeral EIP-712 test signer in memory;
2. signs one synthetic Epoch-2 gateway intent;
3. admits it through the exact production binding against the selected replay
   root;
4. requires one fresh atomic replay-digest consumption;
5. creates a fresh binding instance over the same replay root; and
6. requires the same signed intent to fail as
   `intent_replay_detected_at_atomic_consume`.

The ephemeral private key is never persisted or emitted.

This test necessarily creates one durable digest marker in the selected
production replay root. The evidence records this explicitly as:

```text
bounded_canary_replay_store_mutation=true
production_store_mutation_scope=single_synthetic_digest_marker
```

No automatic marker deletion or digest reuse is permitted.

## Evidence meaning

A valid runtime candidate may establish:

```text
production_replay_root_selected=true
production_service_identity_bound=true
same_uid_production_trust_proven=true
canary_fresh_consumed=true
canary_replay_rejected_after_reopen=true
```

It deliberately does **not** yet establish:

```text
production_gateway_replay_store_binding_verified=true
runtime_route_active=true
public_submission_open=true
cross_epoch_replay_protection_proven=true
migration_authorized=true
public_activation_authorized=true
```

A separate importer/promotion step must verify the real fresh Precision
evidence before any of those gates may move.

## Authority boundary

The source package does not authorize installation, service start, or the
bounded production replay canary merely by being merged.

The live operator step requires separate explicit execution. Even then, the
runtime remains inactive and performs no RPC, EVM transaction construction,
transaction signing, transaction submission or broadcast, authoritative
Chain-2050 write, operator wallet access, credential-content access, validator
mutation, token movement, or funds movement.

## Source verification

```bash
node scripts/prove_void_economic_epoch2_production_gateway_replay_binding_runtime_evidence_v1.mjs
```

## Later live sequence

After this source package is canonical mainline, the intended Precision sequence
is:

```bash
START_SERVICE=1 bash ops/mainnet0/install-void-economic-epoch2-inactive-public-submission-gateway-v1.sh

bash scripts/run_void_economic_epoch2_production_gateway_replay_binding_runtime_evidence_v1.sh \
  "$HOME/Downloads/void_epoch2_production_gateway_replay_binding_runtime_evidence_v1_<UTC>.json"
```

The collector is an executable script; it must not be sourced into an
interactive shell.
