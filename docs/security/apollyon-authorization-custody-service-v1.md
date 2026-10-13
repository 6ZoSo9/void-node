# Apollyon authorization custody service v1

Marker: `VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1`

Status: **source/proof-only AF_UNIX service boundary**.

## Purpose

V81 wraps the merged V80 custody core behind one fixed AF_UNIX endpoint so a
future Xiphos training/runtime UID does not need direct filesystem authority over
the custody state.

The service still does not prove that cross-UID deployment exists. It does not
create users/groups, install systemd units, create production directories,
change production ownership, or start on import.

## Target deployment

```text
Xiphos training/runtime UID
  -> AF_UNIX client
  -> dedicated Apollyon custody-service UID
       -> V80 pinned custody core
       -> private replay state
```

The future socket directory must be owned by the custody UID, mode `0750`,
with a dedicated IPC group. The training/runtime identity may receive IPC-group
access but must not have directory write permission.

The socket is mode `0660`.

## Service configuration

Server configuration fixes:

- one absolute advertised socket path;
- one absolute V80 state root;
- one IPC group GID;
- one expected operator raw-public-key SHA-256; and
- one operator public-key PEM.

Requests cannot select a filesystem path, record filename, trust key, or state
generation.

## Request protocol

Two methods exist:

- `consume`: carries one exact V78 packet;
- `assert`: carries one exact authorization ID.

Requests are bounded to 64 KiB and must match the service's canonical JSON
serialization byte-for-byte with one trailing newline. Duplicate JSON keys,
alternate whitespace, and ambiguous encodings therefore fail closed.

The service delegates all authorization semantics and record creation to the
merged V80 core.

## Socket publication

The service does not make Node listen directly on the advertised pathname.

It:

1. listens on a fresh private pathname inside the server-controlled socket
   directory;
2. applies mode `0660` and the configured IPC group to that socket;
3. records the socket inode identity; and
4. hard-links that exact inode to the advertised pathname.

Publication fails if the advertised pathname already exists.

On stop, Node closes/removes only the private listen pathname. The advertised
hard link is deliberately **not** unlinked by the source service. It becomes a
stale non-listening socket path.

Stale-link cleanup/restart belongs to a later host-exclusive lifecycle gate.
This avoids a stop-time pathname cleanup race.

## Deliberate non-claims

Source authority keeps:

```text
same_uid_socket_path_tamper_resistance_claimed=false
custody_core_leaf_unlink_resistance_claimed=false
live_host_qualification_performed=false
independent_custody_proven=false
production_gate_ready=false
operator_private_key_access=false
production_signing=false
attempt_claim=false
training_execution=false
candidate_weight_mutation=false
generation_execution=false
wallet_access=false
transaction_signing=false
transaction_broadcast=false
funds_movement=false
```

A future host qualification must prove the training/runtime UID cannot mutate
the socket directory or custody root, and that the custody service is the only
admitted process running as the custody identity.

## Client

The paired client is AF_UNIX-only with:

- one fixed socket path;
- bounded request timeout;
- bounded response bytes;
- exact request-digest binding;
- no automatic retry;
- no HTTP/HTTPS fallback; and
- no network fallback.

## Next gate

A source-only host/service policy classifier and then designated-host evidence
must prove actual UID/GID separation, protected ancestry, socket permissions,
service hardening, and denial of direct writer access.

Only after that may a later gate consider attempt claim.

## Proof

```bash
node --check tools/apollyon-authorization-custody-service-v1.mjs
node --check tools/apollyon-authorization-custody-client-v1.mjs
node --check scripts/prove_apollyon_authorization_custody_service_v1.mjs
node scripts/prove_apollyon_authorization_custody_service_v1.mjs
```

The proof uses an ephemeral Ed25519 key and temporary directories only. It
proves source-service start, socket policy, consume/duplicate/assert,
invalid-signature rejection, conservative stop behavior, stale advertised
socket behavior, and the no-training/no-wallet/no-funds authority boundary.
