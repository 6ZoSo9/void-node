# Buy VOID allocation-custody runtime V3 UID process census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_UID_PROCESS_CENSUS_V1`.

Status: **read-only dedicated-service-identity process observation only**.

This is a sibling gate to the filesystem-prestate and service-quiescence
censuses. It consumes the same accepted V3 archive lock and exact custody
RuntimeDirectory policy, but advances no installation or service authority.

## Exact identity input

The source binds the canonical custody service identity from the accepted
socket/runtime policy:

```text
service user: void-buy-custody
service group: void-buy-custody
```

The source policy Git blob is
`9d4b97a822b50c525722f0decae9205a9aebeb4a`.

The accepted archive-lock Git blob remains
`edb4ea2b833373ab387762e45ba7da4032c860f3` with SHA-256
`ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7`.

## Account observation

The census resolves `void-buy-custody` and its primary group using the host
account database.

If the service account is absent, the census records that fact but does **not**
claim UID-process quiescence because no durable numeric UID has been identified.

If the account exists, the primary GID must match the canonical
`void-buy-custody` group before process observation continues.

No account, group or membership is modified.

## Process observation

The census walks numeric entries under `/proc` and reads only each live
process's bounded `status` pseudo-file. From that file it accepts exactly one:

```text
Uid: <real> <effective> <saved-set> <filesystem>
```

line.

A process belongs to the custody census if the dedicated custody UID appears in
**any** of those four slots. This prevents an effective-UID transition from
hiding a custody-owned process.

The census does **not** read:

```text
/proc/<pid>/cmdline
/proc/<pid>/environ
/proc/<pid>/exe
/proc/<pid>/fd/*
```

It sends no signal and performs no process-control syscall.

If a numeric live process cannot be classified because its `status` file is
missing, unreadable, malformed or over the bound while the process directory
still exists, the census HOLDs rather than assuming it is unrelated.

## Bounded enumeration

Numeric `/proc` names are collected lazily. More than 131,072 numeric
process entries HOLD **before sorting**.

The custody UID process set is collected twice. Any change between the two
passes HOLDs.

The output does not expose matching process IDs. It emits only:

- matching process count; and
- SHA-256 of the canonical sorted matching-PID set.

## Candidate boundary

When the canonical account exists and the stable matching process count is zero:

```text
zero_uid_processes_observed=true
dedicated_uid_process_quiescence_candidate=true
```

But this generation always retains:

```text
dedicated_uid_process_quiescence_proven=false
global_runtime_reference_quiescence_proven=false
```

because another UID could still hold an open reference to the legacy runtime
tree. A later descriptor/reference census must address that separately before
replacement.

## Invocation

After focused source/CI qualification:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_uid_process_census_v1.py \
  --census
```

No sudo is required or authorized.

## Authority remains false

```text
read_only=true
proc_status_uid_only=true
process_cmdline_read=false
process_environment_read=false
process_executable_read=false
process_fd_read=false
process_signal=false
service_mutation=false
filesystem_write=false
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

This source does not stop a process, stop/start/restart a service, inspect
customer/payment/custody data, install anything, or move funds.

**PROTECT THE CORE.**
