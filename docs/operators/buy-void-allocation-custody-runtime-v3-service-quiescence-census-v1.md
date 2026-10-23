# Buy VOID allocation-custody runtime V3 service quiescence census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_SERVICE_QUIESCENCE_CENSUS_V1`.

Status: **read-only service/socket observation only**.

This is a sibling gate to the filesystem prestate census. It consumes the same
accepted V3 archive lock but does not depend on or replace filesystem-prestate
evidence. A future install/replacement planner must compose both.

## Exact source inputs

The census binds:

- accepted archive lock Git blob
  `edb4ea2b833373ab387762e45ba7da4032c860f3`;
- accepted archive-lock SHA-256
  `ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7`;
- custody bootstrap-policy Git blob
  `63eb0aa4e4211869284d389839e71e23554d62b1`;
- custody RuntimeDirectory/socket-policy Git blob
  `9d4b97a822b50c525722f0decae9205a9aebeb4a`.

The exact canonical operational identifiers are:

```text
systemd manager: system
unit: void-buy-allocation-custody-v1.service
service user: void-buy-custody
service group: void-buy-custody
IPC group: void-buy-custody-ipc
runtime directory: /run/void-allocation-custody-v1
socket: /run/void-allocation-custody-v1/custody.sock
```

## Systemd observation

The production census executes only:

```text
/usr/bin/systemctl --system show void-buy-allocation-custody-v1.service ...
```

with a fixed property allowlist:

```text
Id
LoadState
ActiveState
SubState
UnitFileState
MainPID
ControlPID
FragmentPath
NeedDaemonReload
```

It does not request `ExecStart`, environment data or arbitrary process
arguments. The exact `/usr/bin/systemctl` binary must be a root-owned regular
file and must not be group/world writable.

No `start`, `stop`, `restart`, `enable`, `disable`,
`daemon-reload`, `mask`, `unmask` or `kill` operation exists in this
generation.

## Runtime directory and socket

The census performs metadata-only observations of:

```text
/run/void-allocation-custody-v1
/run/void-allocation-custody-v1/custody.sock
```

The runtime-directory path, if present, must be a direct directory rather than
a symlink. The socket path, if present, must be an AF_UNIX socket rather than a
symlink or ordinary file.

It never connects to or unlinks the socket.

## Candidate versus proof

A **service quiescence candidate** requires:

- `ActiveState=inactive`;
- `SubState=dead` or `exited`;
- `MainPID=0`;
- `ControlPID=0`; and
- the canonical socket path absent.

A missing unit with those conditions is recorded separately as
`unit_absent_observed=true`. A loaded but inactive unit may also be a
quiescence candidate.

This generation deliberately reports:

```text
service_quiescence_proven=false
live_process_binding_checked=false
```

because it does not scan arbitrary processes or open file descriptors for
references to the legacy runtime tree. That is a separate later gate before
any replacement ceremony.

## Invocation

After source/CI qualification:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_service_quiescence_census_v1.py \
  --census
```

No sudo is required or authorized.

## Authority remains false

```text
read_only=true
filesystem_write=false
systemd_show_only=true
systemd_mutation=false
daemon_reload=false
service_start=false
service_stop=false
service_restart=false
socket_connect=false
socket_unlink=false
service_quiescence_proven=false
live_process_binding_checked=false
process_environment_read=false
process_arguments_read=false
request_history_read=false
custody_data_read=false
credential_access=false
wallet_or_signer_access=false
install_target_selected=false
existing_target_replaced=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

A later planner must bind this census, the independent filesystem-prestate
census, exact Node/runtime identity and a separate live-process reference check
immediately before any durable mutation.

**PROTECT THE CORE.**
