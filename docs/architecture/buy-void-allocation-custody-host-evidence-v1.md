# Buy VOID allocation custody host evidence v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1` is a read-only
designated-host evidence collector for the merged allocation-custody
qualification contract.

It does not qualify the host by itself. It collects and content-addresses the
facts consumed by the merged `#2456` pure classifier.

This lane performs no service installation/start/restart, daemon reload,
mount/remount, chmod/chown, directory/socket creation, payment acceptance,
wallet/key/signer access, transaction construction/signing/broadcast,
Chain-2050 mutation, inventory mutation, presale/market activation,
treasury/liquidity action, or funds movement.

## Reviewed dependencies

The collector binds:

- the exact merged allocation publication writer source bytes;
- the exact merged allocation custody service source bytes;
- `docs/architecture/buy-void-allocation-custody-service-contract-v1.json`;
- effective service properties from `systemctl show`;
- exact root/ancestor filesystem identity;
- mount source/UUID/major:minor/statfs identity;
- live AF_UNIX socket ownership/mode/group evidence;
- machine and boot identity digests; and
- a bounded collector-owned freshness window.

The custody service contract remains source-only. Observing it does not install
or start a service.

## Runtime service-control denial

Merged `#2456` requires:

`runtime_can_control_service=false`.

The collector does **not** hardcode that value.

The collector first identifies the actual running public Buy runtime service
from server-controlled configuration and binds:

- configured runtime unit name;
- effective `User` and `Group`;
- `MainPID`;
- cgroup path;
- `NoNewPrivileges=true`;
- live process UID/GID; and
- Linux process start-time ticks from `/proc/<pid>/stat`.

The service-control model is explicitly reviewed for **systemd major 255**.
The collector reads `systemctl --version` and HOLDS on any other major so a
future systemd authorization surface cannot silently inherit this qualification.

Before Polkit is accepted as evidence, the collector also closes systemd's
Linux-capability bypass path. The configured runtime service must expose empty
`CapabilityBoundingSet` and `AmbientCapabilities`, and the live runtime
process must report zero `CapInh`, `CapPrm`, `CapEff`, and `CapAmb`
masks from `/proc/<pid>/status`. Any nonzero live capability HOLDS.

It then forms the race-resistant Polkit subject:

`PID,START_TIME,UID`.

For the protected allocation-custody service the collector performs
**non-interactive** `pkcheck` authorization queries.

Required unit-control action:

`org.freedesktop.systemd1.manage-units`.

The collector checks the action generally and with the exact protected custody
unit plus the complete reviewed v255 unit/job control verb set:

- `start`;
- `verify-active`;
- `stop`;
- `reload`;
- `reload-or-start`;
- `restart`;
- `try-restart`;
- `try-reload`;
- `nop`;
- `reload-or-restart`;
- `reload-or-try-restart`;
- `kill`;
- `clean`;
- `set-property`;
- `reset-failed`;
- `ref`;
- `bind-mount`; and
- `mount-image`.

For systemd v255, freeze/thaw authorization resolves through the existing
`stop`/`start` verbs. Manager/job operations that invoke
`manage-units` without unit/verb details are covered by the separate generic
no-detail denial probe.

It separately requires denial for:

- `org.freedesktop.systemd1.manage-unit-files`;
- `org.freedesktop.systemd1.reload-daemon`; and
- `org.freedesktop.systemd1.set-environment`.

### Fail-closed result rule

Only `pkcheck` exit status **1** qualifies as explicit denial.

The collector HOLDS when a query returns:

- `0`: authorized;
- `2`: authorization would require interaction / no suitable agent;
- `3`: authentication request dismissed;
- `126`: malformed invocation;
- `127`: authorization-check error; or
- any other unexpected result.

The collector never passes `--allow-user-interaction` and never enables an
internal authentication agent.

This is deliberately stricter than “the runtime cannot do it without a
password.” Production custody requires the admitted runtime identity to be
explicitly denied service-management authority, not merely subject to an
interactive administrative challenge.

## Evidence packet

A successful collector packet includes the full runtime service-control
evidence alongside the host evidence consumed by `#2456`:

- runtime unit;
- main PID;
- cgroup;
- process start-time ticks;
- process UID/GID;
- exact `pkcheck` subject;
- every checked Polkit action/detail pair;
- explicit-denial result for every check; and
- derived `runtime_can_control_service=false`.

The packet remains content-addressed by
`collector_receipt_sha256`.

The host evidence continues to include:

- exact writer Git/SHA-256 identity;
- machine/boot identity digests;
- runtime/custody UID/GID separation;
- descriptor-bound root and ancestor identities;
- runtime write/rename evidence;
- mount/storage-domain identity;
- effective custody-service hardening;
- exact AF_UNIX socket authority;
- reviewed custody-service contract/source identities;
- no fallback storage; and
- bounded evidence freshness.

## Double-census rule

Static host evidence is collected twice. The canonical form of both observations
must be byte-identical before the freshness snapshot is added.

A changing process, mount, ancestor, service policy, socket, contract, runtime
authorization result, or writer identity therefore HOLDs instead of producing a
receipt.

## Remaining authority boundaries

A collector receipt still does **not** establish:

- trusted wall-clock authority;
- monotonic evidence-generation authority;
- prior custody receipt external trust;
- immutable backup/snapshot policy;
- live service installation correctness;
- live mount/bootstrap correctness;
- runtime integration;
- production readiness;
- payment acceptance;
- activation; or
- funds authority.

Those remain later designated-host gates.

The collector itself reports no host mutation and no filesystem write.

## Synthetic proof

The focused proof does not execute host authorization checks in CI.

It proves source semantics only:

```bash
node --check tools/void-buy-allocation-custody-host-evidence-v1.mjs
node scripts/prove_void_buy_allocation_custody_host_evidence_v1.mjs
```

The proof requires:

- reviewed custody-service source/contract binding;
- `PID,start-time,UID` subject construction;
- reviewed systemd major 255;
- empty configured runtime capability sets and zero live process capabilities;
- explicit status-1 denial as the only accepted Polkit result;
- authorization/challenge/dismiss/error fail-closed semantics;
- the reviewed systemd action/verb set;
- no interactive Polkit mode;
- no hardcoded `runtime_can_control_service=true`;
- control-denial evidence included in the content-addressed packet; and
- no filesystem mutation APIs in the collector.

## Live qualification sequence

A later explicitly authorized operator lane must:

1. install/bootstrap the reviewed custody service and storage policy;
2. configure an explicit Polkit policy that denies the public runtime identity
   the reviewed systemd control actions;
3. run this collector read-only on the designated host;
4. feed the exact collector host evidence to the merged pure qualification
   classifier;
5. bind trusted time, monotonic evidence generation, and prior-receipt trust;
6. prove restart/rollback independence; and
7. only then consider a later runtime-integration gate.

None of those live actions are authorized by this source lane.
