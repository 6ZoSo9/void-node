# DataNet registry broadcast generation custody service v1

Status: **source/proof only**. This lane progresses issue #2549 but does not
close its live-host custody requirement.

## Purpose

Merged #2554 intentionally hard-HOLDs the normal DataNet registry broadcast
wrapper until a generation fence is held outside the same-UID state-root
namespace. This lane defines the next narrow source boundary:

```text
DataNet broadcast runtime
  -> bounded AF_UNIX request
  -> dedicated generation-custody service
       -> server-controlled create-only fence root
```

The service/client source does not install or start a production unit, create a
production root, change ownership or permissions, call RPC, access a wallet or
signer, construct/sign/broadcast a transaction, mutate Chain-2050, deploy the
registry, activate an economic lane, or move funds.

## Service contract

The service source is:

`tools/void-datanet-registry-broadcast-generation-custody-service-v1.mjs`

Server configuration fixes:

- one absolute Unix socket path;
- one absolute fence root; and
- one socket IPC group GID.

Requests cannot select a path, filename, generation, or arbitrary bytes.

The exact request envelope supports only:

- `method=claim`;
- `method=assert`.

The service independently re-derives
`broadcast_generation_fence_id` from the stable identity fields already
defined by merged #2554:

- state-root pathname SHA-256;
- exact broadcast operation;
- authorization/request identity;
- signed transaction identity/hash; and
- one-attempt/no-retry/no-replacement policy.

Generation-local consumption ID and root device/inode remain first-observation
evidence only. A compatible replacement root at the same pathname therefore
maps to the same create-only fence record.

## Storage boundary

Fence records are named only by the validated fence ID and are created with
`O_CREAT|O_EXCL|O_NOFOLLOW`, mode `0600`.

The service opens the server-controlled fence root as a private no-follow
directory and retains the descriptor. Record I/O is relative to
`/proc/self/fd/<dirfd>`; successful creation fsyncs the record and retained
directory.

Existing records are bounded, single-link, owner/mode checked, read through an
opened descriptor, checked for change during read, schema-validated, and bound
back to the exact stable fence identity.

An existing record returns `status=exists`; it is never removed to create a
retry opportunity.

Service cleanup also isolates the advertised Unix-socket pathname before
calling Node's `server.close()`. If the pathname still refers to this service's
bound inode, that inode is quarantined and removed only after close. If a
successor socket has replaced the advertised pathname, the successor is
quarantined, the old listener is closed while the advertised pathname is
absent, and the exact successor inode is restored afterward. This prevents old
service cleanup from unlinking another live service's endpoint.

## Client transport

The client source is:

`tools/void-datanet-registry-broadcast-generation-custody-client-v1.mjs`

It supports only AF_UNIX and one server-configured socket path. Each request
has:

- bounded connect timeout;
- bounded response/inactivity timeout;
- the caller's stricter total deadline;
- exact request/response digest binding;
- bounded response bytes; and
- mandatory `AbortSignal` handling that destroys the socket.

There is no redirect, URL, network fallback, retry loop, or caller-selected
socket per operation.

## Deliberate non-claim

This source service **does not return or assert live independent custody**.

Every successful decision keeps:

```text
independent_custody_proven=false
live_host_qualification_performed=false
```

That is intentional. Running the source under the same UID in a synthetic test
does not prove that the production broadcast runtime cannot rename, recreate,
remount, or control the service/fence authority.

A later designated-host qualification/composition gate must establish:

- dedicated service UID/GID distinct from the broadcast runtime;
- root-owned non-writable ancestor chain;
- server-controlled socket parent and fence root;
- runtime inability to write/rename/recreate/remount the fence root;
- runtime inability to control the custody service;
- exact installed service source identity;
- exact systemd hardening and writable-path allowlist; and
- bounded AF_UNIX client transport using this AbortSignal contract.

Only that qualified composition may adapt a service result into #2554's
`independent_custody_proven=true` dependency seam. This PR does not perform
that adaptation.

## Focused proof

The deterministic proof:

1. starts the service only on temporary private directories;
2. claims one fence and asserts its receipt;
3. proves exact replay returns `exists`;
4. changes generation-local consumption/dev/inode evidence while preserving
   the stable fence ID and proves it still returns the same existing slot;
5. corrupts the stored record and requires HOLD;
6. attempts request path injection and requires HOLD;
7. creates a second operation and proves a distinct slot;
8. replaces a still-live old service socket pathname with a successor server,
   stops the old service, and proves the successor inode/listener still works;
   and
9. uses a real non-responding Unix socket to prove an AbortSignal destroys the
   client connection.

The proof makes no live RPC request and uses no signed artifact or credential.

## Next gate

After exact-head hosted GREEN and review, the next #2549 lane is designated-host
service/custody qualification plus a composition adapter that may only expose
`independent_custody_proven=true` when that host evidence is current and
authoritative.

No merge of this source lane should be interpreted as restoring production
broadcast authority.
