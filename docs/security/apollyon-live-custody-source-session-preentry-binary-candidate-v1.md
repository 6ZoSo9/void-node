# Apollyon live custody source/session pre-entry binary candidate v1

Marker: `VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_PREENTRY_BINARY_CANDIDATE_V1`

Status: **source/CI-only ELF candidate; unaccepted and not installed**.

## Purpose

#3046 adds the native trust-root source for the current-V2 live custody
source/session execution closure.

This lane derives a reproducible ELF identity for that exact source before any
create-only installer may be written.

## Exact source

```text
path
ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c

Git blob
1d0d9893939d1a457970b3b1f16dae06e7fef067
```

The fixed compile recipe is:

```text
/usr/bin/cc
-std=c11
-O2
-Wall
-Wextra
-Werror
-D_FORTIFY_SOURCE=2
-fstack-protector-strong
-Wl,-z,relro,-z,now
-Wl,--build-id=none
SOURCE_DATE_EPOCH=0
```

Each hosted lane compiles twice, requires exact binary equality, verifies ELF
magic and the exact pre-entry self-test transcript, then emits one canonical
candidate report.

Three independent Ubuntu 24.04 lanes must produce byte-identical reports. The
compare job separately recompiles the checked-out source and requires the local
binary identity to equal the hosted report before the THREE_RUN_GREEN marker.

## Authority

A green candidate still reports:

```text
candidate_binary_identity_accepted=false
host_installation=false
live_source_session_execution=false
durable_attempt_claim=false
training_execution=false
candidate_weight_mutation=false
service_action=false
operator_private_key_access=false
funds_movement=false
```

No ELF is committed, installed or run on Xiphos by this lane.

Next gate:

`apollyon_live_custody_source_session_preentry_binary_lock_v1`.
