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

It also exposes a read-only `inspectConsumed(digest, metadata)` helper for
pre-admission rejection of digests that are already known consumed. That helper
does not replace the atomic consume decision.

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

## Read-only consumed inspection

`inspectConsumed(digest, metadata)` validates the same digest and canonical
metadata domain as `consumeIfFresh(...)`, revalidates the pinned replay root,
and performs no filesystem mutation.

It returns:

```text
known_consumed
audit_receipt_present
mutation_performed=false
atomic_consume_performed=false
negative_freshness_authorized=false
execution_authorized=false
```

If the authoritative digest marker directory is present, the result reports
`known_consumed=true`. If `receipt.json` is also present, the exact audit
metadata must match. If the audit receipt is absent after the marker exists, the
digest is still known consumed because the directory is replay authority.

If the marker is absent, the inspector checks absence twice around a pinned-root
revalidation and returns `known_consumed=false`. This negative result is
deliberately advisory only. A concurrent process may atomically consume the
digest immediately after inspection, so the negative result never authorizes
execution and never substitutes for a later `consumeIfFresh(...)`.

This makes the helper suitable for rejecting **already executed** sponsored
requests before trusted-time mutation while preserving retry semantics for
requests that have not yet been atomically consumed.

## Runtime-evidence source-equivalence bridge

The Sep-29 production canary exercised the predecessor durable replay-store
source generation, Git blob
`2e4481fbf45200121356f39c278eac5b05a33596`, from source commit
`24806b94cbaf3ea19d206ce542f4804cce5112db`.

This lane changes the replay-store source blob to
`2b267e11d087bec0e0a56825dce9f998d5bc3ad5` by adding the read-only
`inspectConsumed(...)` API and factoring receipt inspection through
`inspectExistingReceipt(...)`. The historical runtime canary is not evidence
for the new inspection API.

The reviewed source-equivalence bridge at
`ops/mainnet0/economic-epoch2-durable-replay-store-consume-equivalence-v1.json`
permits carry-forward of that historical canary for exactly one surface:
the production gateway's atomic `consumeIfFresh(...)` replay path.

Its proof requires:

- the predecessor and successor replay-store Git blobs exactly;
- byte-for-byte equality of the complete `consumeIfFresh(...)` method;
- equivalence of predecessor receipt validation to the successor
  `inspectExistingReceipt(...)` plus delegate-only
  `validateExistingReceipt(...)` wrapper;
- the production gateway still calls `consumeIfFresh(...)` and does not call
  `inspectConsumed(...)`;
- the exact historical runtime-evidence SHA-256, evidence ID, and import time;
- `runtime_canary_reexecuted=false`;
- no new negative-freshness or atomic-consume authority; and
- all route, transaction, Chain-2050, migration, activation, and funds
  authorities remain false.

The cross-epoch replay promotion function now hard-requires this bridge. A
caller cannot repin the replay-store source and promote replay evidence without
supplying a bridge whose successor blob matches the current canonical
source-binding policy.

Source equivalence itself is receipt-independent: a later fresh runtime-evidence
receipt may use the same reviewed old/new source bridge. The committed-real
promotion proof separately requires the bridge's historical evidence
SHA-256/ID/import time to equal the Sep-29 canary before that specific canary is
carried forward. Generic synthetic/future receipts are not forced to impersonate
the Sep-29 import timestamp.

This is intentionally narrower than runtime certification of the new
`inspectConsumed(...)` helper. Inspection remains source/proof only and
advisory; the historical canary carries forward only the unchanged atomic
consume behavior.

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

- absent-digest read-only inspection with no marker creation;
- consumed-digest inspection with audit receipt present;
- consumed-digest inspection after audit receipt loss;
- inspection metadata mismatch fail-closed;
- inspection marker-symlink rejection;
- source-slice proof that inspection contains no filesystem mutation primitive;
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
read_only_consumed_inspection=true
known_consumed_detection=true
negative_freshness_authorized=false
inspection_mutation_performed=false
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

The proof mutates only fresh temporary owner-private test directories. The
read-only inspector itself performs no mutation and cannot authorize freshness
or execution. This source lane does not bind a production replay path, open a
route, call RPC,
persist wallet/signer secrets, construct/sign/submit/broadcast an Ethereum
transaction, write authoritative Chain-2050 state, mutate validators, move
tokens/funds, authorize migration, or activate the public economic surface.

Verification:

```bash
node scripts/prove_void_economic_epoch2_durable_replay_store_consume_equivalence_v1.mjs
node scripts/prove_void_economic_epoch2_durable_replay_store_v1.mjs
```
