# Epoch-2 production gateway runtime evidence candidate v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1`

Status: **machine-local read-only evidence candidate; live replay binding remains HOLD**.

## Purpose

This lane follows the source-only inactive runtime wrapper:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1`

The inactive runtime constructs the exact reviewed production gateway/replay-store
binding from one exact private replay root, writes a private startup receipt,
opens no network listener, and keeps the production replay-store binding false.

This collector adds the missing machine-local observation layer without choosing
or installing a service.

## Reviewed service contract

The collector requires an explicit content-addressed service contract:

`voide2grc1_<sha256>`

The contract is supplied by the caller and must already bind:

- exact hostname;
- exact systemd **user** service unit;
- exact unit-file SHA-256;
- exact inactive-runtime source SHA-256;
- exact replay-root path SHA-256;
- exact private startup-receipt path SHA-256;
- bounded evidence lifetime, at most one hour;
- current-operator UID ownership;
- the reviewed same-UID process model;
- a required private startup receipt;
- zero service socket file descriptors; and
- the required closed route / public submission / transaction / Chain-write
  posture.

The collector does not invent any of those values.

## Read-only runtime observations

After explicit confirmation, the collector reads only bounded runtime metadata.

It requires:

- `systemctl --user show` reports the reviewed service as
  `active/running`;
- stable MainPID, InvocationID, cgroup path, and FragmentPath across two
  snapshots;
- the unit file is direct, current-UID owned, not group/world writable, stable
  during read, and matches the contract SHA-256;
- the inactive-runtime source file is direct, current-UID owned, stable during
  read, and matches the contract SHA-256;
- the replay root is direct, realpath-exact, current-UID owned, exactly
  `0700`, and matches the reviewed path hash;
- the startup receipt is direct, current-UID owned, exactly `0600`, stable
  during read, content-addressed, fresh, and bound to the same MainPID,
  hostname, UID, source hash, gateway/binding/store markers, and replay-root
  identity;
- all service cgroup members have the current UID;
- MainPID is a member of the reported service cgroup;
- all service members share one network namespace; and
- the service cgroup owns **zero socket file descriptors**.

The collector intentionally does not read process argv, `/proc/*/cmdline`,
`/proc/*/environ`, service `ExecStart`, credentials, private keys, or wallet
material.

## Private evidence candidate

When an output path is supplied, its existing parent must be a current-UID
private `0700` directory. The evidence file is created once as `0600`,
fsynced, and never overwritten.

The content-addressed evidence ID has the form:

`voide2gre1_<sha256>`

and binds the observed runtime facts **and** the collector's authority posture.

A successful collection may establish only candidate facts such as:

```text
systemd_service_active=true
systemd_service_running=true
same_uid_process_model_observed=true
no_service_socket_fds_observed=true
replay_root_binding_receipt_verified=true
production_gateway_replay_store_binding_evidence_candidate=true
```

It deliberately retains:

```text
upstream_live_evidence_semantically_verified=false
runtime_service_identity_verified=false
same_uid_process_model_verified=false
production_gateway_replay_store_binding_verified=false
cross_epoch_replay_protection_proven=false
runtime_route_active=false
public_submission_open=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement=false
```

A later importer must independently bind the reviewed service contract, exact
evidence bytes, evidence ID, freshness, and runtime facts before the live
production replay-store binding can advance.

## Explicit confirmation

Collection requires exactly:

`collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidence`

The confirmation is checked before runtime/filesystem inspection.

## Authority boundary

The collector has narrowly scoped read-only systemd/procfs/filesystem metadata
authority and optional private evidence-file creation.

It performs no service action, network request, credential/key/wallet access,
transaction construction/signing/submission/broadcast, validator mutation,
authoritative Chain-2050 write, token/funds movement, migration, or public
activation.

The hosted proof uses only injected synthetic systemd/proc facts and fresh
temporary private directories.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_gateway_runtime_evidence_candidate_v1.mjs
```
