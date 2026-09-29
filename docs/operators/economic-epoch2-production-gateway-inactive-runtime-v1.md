# Epoch-2 production gateway inactive runtime v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1`

Status: **source-ready inactive runtime wrapper; live service binding remains HOLD**.

## Purpose

The existing production gateway replay-binding source proves that the exact
durable replay store is injected into the exact Epoch-2 submission gateway core,
but it deliberately does not choose a production replay-root path or service
identity.

This lane adds the next source prerequisite without opening any route.

The runtime wrapper takes one explicit replay root and constructs:

`createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({ replayRoot })`

with that exact value.

It then writes a private startup identity receipt and remains alive with no
network listener.

## Explicit confirmation

Starting the wrapper requires:

`startVoidEconomicEpoch2ProductionGatewayInactiveRuntime`

The confirmation is checked before replay-root or status-file access.

## Replay-root custody

The replay root must be:

- absolute;
- direct, not a symlink;
- realpath-exact;
- owned by the current runtime UID; and
- exactly mode `0700`.

The wrapper captures dev/inode/uid/gid/mode/realpath identity before binding,
constructs the reviewed production binding with that exact path, and rechecks
the identity after binding and after writing the startup receipt.

## Private startup receipt

The caller supplies an absolute status-file path whose existing parent must be a
direct current-UID `0700` directory.

The status file is created once with `O_EXCL`, mode `0600`, fsynced, and its
parent directory is fsynced.

The content-addressed `voide2grt1_<sha256>` receipt binds:

- Chain 2050 / execution epoch 2;
- hostname, PID, and UID;
- exact runtime source-file SHA-256;
- exact gateway, replay-store, and production-binding markers;
- replay-root path hash plus dev/inode/uid/gid/mode identity;
- exact-root binding construction; and
- the closed runtime/public/transaction authority posture.

The replay-root path itself remains inside the private `0600` receipt and is
not printed by the runtime CLI.

## Deliberate HOLD

This source wrapper establishes only that one process constructed the reviewed
binding from one exact private replay root while the route is closed.

It deliberately keeps false:

```text
runtime_service_identity_verified=false
same_uid_process_model_verified=false
production_gateway_replay_store_binding_verified=false
runtime_route_active=false
public_submission_open=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
```

A later machine-local collector must bind this receipt and process to the exact
reviewed systemd user service/cgroup, prove the compliant same-UID namespace
model (or stronger isolation), and independently revalidate the replay-root
identity before the live production replay-binding gate can advance.

## No network surface

The runtime wrapper does not import or create an HTTP/TCP server and does not
call the binding's `admit` method. It only constructs and holds the reviewed
binding object.

## Authority boundary

This source runtime may read replay-root/source metadata and create one private
status receipt after explicit confirmation. It does not access credentials,
wallets, or private keys; perform RPC; construct/sign/submit/broadcast a
transaction; mutate validators; write Chain-2050; move tokens/funds; authorize
migration; or activate a public route.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_gateway_inactive_runtime_v1.mjs
```
