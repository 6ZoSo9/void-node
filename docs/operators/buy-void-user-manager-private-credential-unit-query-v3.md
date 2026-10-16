# Buy VOID authenticated credential-unit query v3

Marker: `VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3`.

Status: **source/CI only; no binary acceptance, protected install, or live-query authority**.

## Purpose

V2 fixed the live host shape by allowing a bounded set of legitimate unrelated
systemd drop-ins and credentials while still requiring exactly one Epoch-2
fulfiller credential.

V2 also re-queries and compares the complete bounded metadata sets within a
single native invocation. Its public transcript, however, emitted only counts
and byte counts plus the target Epoch-2 credential. Two separate qualifier
invocations could therefore miss a same-count/same-byte-size substitution of an
unrelated drop-in or credential.

V3 closes only that evidence gap.

## Preserved V2 contract

Unchanged:
- authenticated private user-manager peer;
- retained private connection;
- exact MainPID / parent / UID/GID / cgroup / executable binding;
- NeedDaemonReload=no;
- canonical FragmentPath;
- max 64 DropInPaths;
- exactly one Epoch-2 credential drop-in match;
- max 32 LoadCredential entries;
- unique credential IDs;
- exactly one `buy-void-epoch2-fulfiller-v1`;
- unrelated legitimate credentials allowed;
- complete bounded metadata sets re-queried on the same authenticated
  connection and required identical within one invocation;
- credential contents are never opened or read.

## New transcript fingerprints

V3 emits two additional lowercase SHA-256 fields:

- `DropInPathsSetSha256`: SHA-256 of the exact complete canonical drop-in byte
  sequence already held in memory;
- `LoadCredentialSetSha256`: SHA-256 of the exact complete canonical
  `id=absolute-path\n` credential metadata sequence already held in memory.

The raw complete sets are **not** printed. Only the existing target Epoch-2
drop-in/source fields remain visible.

This makes same-count / same-byte-length substitutions detectable across
separate qualifier invocations without exposing unrelated credential source
paths.

## SHA-256 implementation

V3 uses a self-contained native SHA-256 implementation consistent with reviewed
native SHA-256 primitives already present in the repository.

Self-test requires the standard SHA-256 `abc` vector and proves that two
same-length metadata strings produce different fingerprints.

## Authority

Source/CI only:

- `binary_acceptance=false`;
- `protected_install_authorized=false`;
- `live_query_authorized=false`;
- `credential_contents_read=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A reproducible V3 candidate/lock and versioned installed qualifier are separate
future gates.

PROTECT THE CORE.
