# Economic Epoch-2 durable replay store v1

Marker: `VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1`

Status: **source/runtime adapter green; production gateway binding HOLD**.

## Purpose

The Epoch-2 signed-submission gateway already requires one atomic
`consumeIfFresh(digest, metadata, options)` decision before admission. Its
existing in-memory proof establishes the adapter contract but intentionally does
not prove durable replay state.

This lane provides a concrete filesystem-backed implementation without
activating the public submission route.

## Durable authority model

Each typed-data digest maps to one owner-private directory directly under a
pre-existing owner-private replay-store root:

```text
<root>/<64-lowercase-hex-digest>/
```

The digest directory itself is the create-once replay marker.

Fresh consumption is:

1. validate the digest, fixed gateway metadata, and timeout contract;
2. revalidate the pinned root realpath, inode, owner, type, and permissions;
3. atomically create the digest directory with `mkdir`;
4. fsync the replay-store root;
5. write audit metadata to a private pending file;
6. fsync that file;
7. rename it to `receipt.json`; and
8. fsync the digest directory.

The method cannot return a fresh result before the digest-directory creation is
fsynced into the parent root.

## Why the receipt is not replay authority

The create-once digest directory is authoritative. The JSON receipt is audit
metadata only.

If a process dies after the marker becomes durable but before the receipt is
published, a later consumer still receives the exact replay tuple:

```json
{"consumed":false,"already_consumed":true,"atomic":true}
```

This fail-closed rule prevents receipt loss from resurrecting a consumed
signature.

A present malformed or metadata-conflicting receipt is treated as store
corruption and fails instead of being silently normalized into a replay.

## Namespace threat model

The root realpath, inode, owner, type, and private mode are revalidated before
each marker operation. This detects generation replacement before that check.

Node's filesystem API does not provide this module with an fd-relative
`mkdirat` operation. A hostile process running as the **same UID** could still
race a namespace replacement after the final root revalidation and before the
path-based marker creation. This source gate therefore assumes compliant
same-UID processes.

Production binding must explicitly establish that same-UID trust boundary or
replace the path-based operation with stronger namespace custody. The current
source/runtime proof does not claim protection from a hostile same-UID racer.

## Concurrency and restart proof

The proof covers:

- first consume fresh, second consume replay;
- reopen/new store instance still replay;
- eight independent Node processes racing one digest: exactly one fresh;
- audit-receipt deletion still replay;
- same digest with conflicting metadata fails closed;
- marker symlink substitution fails closed;
- replay-root symlink substitution fails closed;
- replay-root generation replacement fails closed; and
- the adapter composes through the existing inactive public-submission gateway,
  with a reopened store rejecting the same signed intent as replay.

No digest garbage collection or expiry-based digest reuse exists in this
generation. A future retention policy must be a separate reviewed change.

## Current gates

```text
durable_replay_store_implemented=true
durable_replay_store_verified=true
production_gateway_replay_store_binding_verified=false
runtime_route_active=false
public_submission_open=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
```

The generic gateway core still reports its conservative
`durable_replay_store_verified=false` field because it accepts any adapter
satisfying the interface and cannot infer which concrete implementation was
supplied. This lane proves the concrete durable adapter separately; a later
runtime composition/binding gate may promote production gateway truth.

## Authority boundary

The proof mutates only fresh temporary owner-private test directories. This
source lane does not bind a production replay path, open a route, call RPC,
persist wallet/signer secrets, construct/sign/submit/broadcast an Ethereum
transaction, write authoritative Chain-2050 state, mutate validators, move
tokens/funds, authorize migration, or activate the public economic surface.

Verification:

```bash
node scripts/prove_void_economic_epoch2_durable_replay_store_v1.mjs
```
