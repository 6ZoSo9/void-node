# Public participant session durable state v1

Marker:
`VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1_PROOF_GREEN`

## Purpose

Close the durable single-use authentication-state prerequisite in #1648
without activating the public participant login/session surface.

The existing participant read-session trust wall already binds login to an
Ed25519 key and, when role authority is configured, to the current canonical
Chain-2050 `AGENT` role. Its challenge and bearer-session records were
process-local `Map` state. A process crash therefore lost both consumed
challenge history and active session state.

This lane adds one bounded filesystem state store and leaves production route
mounting held.

## Persisted state

The durable snapshot contains only the minimum server-side state required to
preserve authentication semantics across restart:

- active challenge ID, nonce, identity/account binding and expiry;
- active session ID;
- **SHA-256 of the bearer token**, never bearer-token bytes;
- exact account and login-key fingerprint;
- capability and expiry;
- exact closed role-admission metadata when role authority is enabled.

It does not persist:

- a bearer session token;
- an Ed25519 private key;
- a wallet private key or passphrase;
- a signer;
- transaction material;
- Work Credit mutation authority;
- validator mutation authority;
- Chain-2050 write authority; or
- funds authority.

## Filesystem admission

The state path must be absolute and canonical.

Its parent directory must be:

- a real directory, not a symlink;
- owned by the current runtime UID when UID inspection is available;
- exact mode `0700`; and
- captured by exact device + inode + owner + mode identity for the lifetime of
  the store.

Every later read/write/fsync operation revalidates that parent identity. A
same-path replacement directory is a custody loss even when the replacement is
also owned by the same UID and mode `0700`.

An existing state file is opened once with `O_RDONLY | O_NOFOLLOW`. Admission
uses `fstat` on that exact descriptor, reads only the already-admitted bounded
byte length from the same descriptor, then revalidates that the canonical
pathname still names the same device/inode before accepting the parsed
snapshot.

An existing state file must be:

- a regular file, not a symlink;
- canonical at the supplied path;
- owned by the current runtime UID;
- exact mode `0600`;
- non-empty and within the fixed 2 MiB ceiling;
- valid fatal UTF-8; and
- an exact closed V1 snapshot shape.

Malformed, oversized, weak-permission, symlinked or unknown-shape state fails
closed.

## Durable mutation protocol

Every acknowledged authentication-state mutation follows the same protocol:

1. update the in-process candidate state;
2. render and validate one complete V1 snapshot;
3. revalidate the retained parent device/inode custody generation;
4. create a mode-`0600`, `O_NOFOLLOW` temporary file in that **same
   directory**;
5. write the complete snapshot;
6. `fsync` the temporary file while keeping that exact file descriptor open;
7. revalidate parent custody again;
8. atomically rename the still-open temp inode over the canonical state path;
9. prove the installed canonical pathname names the exact same dev/inode as the
   fsynced open descriptor;
10. open the retained parent path as a directory descriptor, verify its
    device/inode identity, and `fsync` that descriptor; and
11. revalidate both the installed file path-to-open-fd identity and parent
    custody again before the mutation is acknowledged.

If persistence fails before the atomic replace, the in-process mutation is
rolled back and the caller receives failure.

If parent custody changes at any later operation, the live store enters a
poisoned fail-closed terminal and rejects all further authentication-state use.

If the atomic replace already occurred but later installed-path validation or
parent descriptor `fsync` fails, durability is ambiguous. The live store keeps
the post-mutation in-memory state, remains poisoned, and must be reconstructed
from the canonical state file under the reviewed parent custody boundary before
use. This prevents an already-visible challenge burn, session issue or logout
from being silently reused because a post-replace durability check failed.

This is a single-process store. It does not claim multi-process writer
coordination. The reviewed public composition/runtime must own one state-store
instance.

## Challenge consumption

A challenge is removed from durable state **before** signature, binding and
role admission continues.

Therefore:

- a failed authentication attempt cannot recover the same one-use challenge
  after process restart;
- a crash after durable challenge consumption leaves the challenge burned;
- a persistence failure does not falsely acknowledge consumption.

## Session issuance

The new session row is durable before the bearer token is returned.

A crash after state commit but before the HTTP response may leave one
inaccessible session row until expiry. That is safe: the only bearer token
bytes existed in the interrupted response path and are never written to disk.

## Logout and authorization races

Logout deletes the session durably before success is returned.

Authorization also performs a final live-session and login-key binding recheck
after role-authority revalidation. This closes the asynchronous interleaving
where logout or key rotation occurs while an awaited Chain-2050 role read is
in flight.

The authorization must still find the same unexpired token digest, account,
capability and key fingerprint at its final commit point.

## Compatibility boundary

The lower-level read-session primitive retains an in-memory store for
unmounted/unit-test use. That fallback reports:

`state_store_durable=false`

The public HTTP contract reports the configured durability state and declares:

`durable_state_store_required_for_production=true`

No production route is mounted by this lane.

## Proof

The dedicated proof covers:

- failed-login challenge consumption surviving restart;
- issued-session authorization surviving restart;
- bearer-token bytes absent from the state file;
- token SHA-256 present instead;
- logout surviving restart;
- HTTP durability reporting;
- logout during awaited role revalidation preventing final authorization;
- exact file mode enforcement;
- `O_NOFOLLOW` descriptor-bound startup reads;
- same-bytes pathname replacement after descriptor open being rejected by
  device/inode mismatch;
- retained parent device/inode custody across later writes;
- same-UID/mode parent-directory replacement poisoning the live store before
  candidate publication;
- keeping the fsynced state descriptor open across rename and rejecting a
  same-bytes/mode installed-path replacement during parent-directory fsync;
- symlink state rejection;
- fatal UTF-8 state rejection;
- closed role-admission schema rejection;
- injected post-replace directory-fsync failure poisoning the live store while
  preserving the visible committed state for restart; and
- no leaked same-directory temporary state file.

The proof runs on Node 22, 24 and 26. Existing participant session/role
integration workflows are also triggered by the changed session source paths.

## Authority boundary

Source, proof and documentation only.

No listener, route mount, service reload/restart, DNS/Tailscale mutation,
credential-content read, private-key access, wallet unlock, signer use,
transaction construction/signing/broadcast, Chain-2050 mutation, Work Credit
mutation, validator mutation, deployment, treasury/liquidity action or funds
movement is authorized or performed.

## Next gate

A later, separately reviewed production-composition lane may bind:

- the accepted live Chain-2050 role-authority observer/binding; and
- one exact durable participant-session state path.

That lane must independently prove startup/restart/rollback behavior before
`production_route_mounted` can change from false.
