# Buy VOID source-finality live-process binding receipt installer V1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1`.

## Purpose

Create the root-custodied receipt consumed by
`buy_void_source_finality_live_process_binding_v1.ts`.

The receipt is generated for the exact active user-systemd
`void-node-live.service` generation. It binds the already-verified V7
deployment receipt to the same running process by PID, Linux start-time ticks,
systemd invocation ID, source commit/tree, cgroup, executable, working
directory, cmdline and initial loader environment.

## Sensitive observation boundary

Collection is privileged and reads `/proc/<MainPID>/environ`. That kernel
file can contain unrelated sensitive values. The collector:

- retains only an explicit allowlist of source identity, `INVOCATION_ID`,
  canonical-producer role and `NODE_OPTIONS`;
- rejects `NODE_PATH`, `LD_PRELOAD` and `LD_LIBRARY_PATH`;
- never returns, logs or persists unrelated environment values; and
- never reads credential files, private keys or wallet material.

Running the collector therefore requires a separate explicit operator
authorization even in `--plan` mode. Committing this source does not grant
that authorization.

## Claims independently proven before receipt construction

The collector requires:

- root execution and a positive runtime UID;
- a direct protected `/run/user/<uid>/bus` user-systemd bus;
- stable `ActiveState=active`, `MainPID` and `InvocationID` before and
  after collection;
- runtime UID/GID equality from `/proc/<pid>/status`;
- zero inherited/permitted/effective/ambient capabilities and
  `NoNewPrivs=1`;
- cgroup-v2 membership ending in `void-node-live.service`;
- exact launcher-produced Node argv including source commit/tree conditions;
- canonical-producer role and reviewed self-HTTP guard in `NODE_OPTIONS`;
- a clean `main` checkout whose HEAD/tree equal the process source tuple;
- root-owned, non-group/world-writable source, launcher, loader and executable
  paths;
- tracked byte identity for `src/index.ts`, the live launcher, source-custody
  checker, tsx loader/preflight and selected self-HTTP guard; and
- the existing root-custodied V7 deployment receipt for the same process source
  commit/tree.

The resulting fields
`source_custody_proven`, `reviewed_service_contract_proven` and
`reviewed_launcher_contract_proven` are therefore derived claims, not
operator assertions.

## Modes

Plan:

```bash
sudo -E npx tsx ops/precision/void_buy_void_source_finality_live_process_binding_receipt_install_v1.ts \
  --plan --runtime-uid <uid>
```

Apply requires the exact additional token:

```text
--apply --confirm create-v7-live-process-binding-receipt
```

If invoked through `sudo`, the collector may use validated `SUDO_UID` when
`--runtime-uid` is omitted.

## Write boundary

Apply writes only the canonical receipt:

```text
/var/lib/void-source-finality-v7/live-process-binding-v1.json
```

The parent must already be root-custodied. Publication is create-once using a
private temporary file, fsync, mode 0444, hard-link no-clobber publication,
temporary unlink and parent-directory fsync.

A byte-identical existing receipt is idempotent. A different existing receipt
HOLDS. This V1 deliberately does not rotate a stale receipt after a service
restart; rotation remains a separate explicit lifecycle action.

## Non-authority

The collector does not restart or mutate the service, contact an RPC, access a
wallet/signer, construct/sign/broadcast a transaction, mutate Chain-2050/WC,
activate the public presale or move funds.

**PROTECT THE CORE.**
