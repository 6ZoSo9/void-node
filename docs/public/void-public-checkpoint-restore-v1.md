# VOID public checkpoint restore v1

## Purpose

This source layer adds a fail-closed fresh-node checkpoint consumer for the
already-reviewed public checkpoint transport.

It does not publish a checkpoint and it is disabled by default.

Enablement is explicit:

```text
VOID_PUBLIC_CHECKPOINT_RESTORE=1
```

The initial v1 integration is HTTPS-supervisor only. Tor-only and composed
multipath startup continue without checkpoint restore; no unsigned checkpoint
path is introduced.

## Fresh-node eligibility

Checkpoint restore is eligible only when `DATA_DIR` does not exist.

An existing ordinary file or directory at `DATA_DIR` makes a new restore
ineligible. The consumer does not delete, rename, empty, reinterpret, or
overwrite an existing data directory.

After a successful restore, the HTTPS supervisor may recognize one special
checkpoint selector symlink at `DATA_DIR`. That selector is identity metadata,
not a filesystem path followed by the node. An unrecognized or malformed
`DATA_DIR` symlink fails closed.

This is intentionally stricter than accepting an existing empty directory.

## Authority and ordering

The HTTPS public-bootstrap supervisor already owns the qualified loopback client
adapter and its ephemeral response-authority secret before the node process is
spawned.

When restore is enabled, the supervisor:

1. starts the existing qualified HTTPS adapter;
2. starts a short-lived restore child with an IPC channel;
3. sends the same ephemeral adapter authority only over IPC after the restore
   child emits the existing authority-ready handshake;
4. receives the exact prepared selection tuple over the same private child IPC
   channel **before** selector publication;
5. waits for the restore child to finish successfully;
6. requires the selector still present at `DATA_DIR` to match that IPC tuple
   exactly before opening the generation; and
7. only then starts `dist/index.js`.

The restore child imports the same production challenged-HMAC authority module
used by follower bootstrap. It does not implement a parallel response-authority
transcript.

### Bounded restore lifetime

After the child requests and receives adapter authority, the supervisor starts one
monotonic restore-attempt lifetime. The default is 45 minutes and the accepted
configuration is bounded above at 60 minutes. Expiry is terminal for the attempt:
the supervisor sends `SIGTERM`, waits one bounded cleanup grace interval, then
uses `SIGKILL` if the restore child does not terminate. Late child IPC or exit
state cannot overwrite the primary timeout terminal.

Checkpoint HTTP acquisition is independently bounded inside that total lifetime.
The header wait and streamed-body wait each own an abort controller deadline.
Response bodies are accumulated only through a size-checked stream; the restore
consumer does not use unbounded `arrayBuffer()` retention. Discovery and manifest
JSON are capped at 8 MiB, while each segment is capped at its exact
manifest-declared byte length and can never exceed the shared 64 MiB v1 segment
ceiling.

## Download and verification

The restore child performs the already-bound ordered transport:

1. authenticated `/__void/checkpoint/v1.json`;
2. authenticated `checkpoint.json`;
3. each authenticated `blocks.bin` segment.

The adapter itself enforces discovery→manifest→segment generation binding before
it emits response authority. The restore child independently verifies the HMAC
and uses the shared checkpoint contract again.

The shared 64 MiB per-segment ceiling remains in force.

If discovery returns `status: unavailable`, the restore child exits successfully
without creating `DATA_DIR`, allowing the ordinary historical follower path to
start.

Any HMAC, qualification, content-binding, manifest, segment, filesystem, or
semantic verification failure aborts startup when restore was explicitly
enabled.

## Generation-bound staging

Each restore attempt creates one unique sibling generation:

```text
<DATA_DIR>.void-public-checkpoint-restore-v1-gen-<128-bit-token>
```

Immediately after creation the restore opens that directory with
`O_DIRECTORY|O_NOFOLLOW`, records its device/inode, and retains the directory
file descriptor for the entire attempt.

All packet writes, semantic verification, and metadata reconstruction use the
retained generation through:

```text
/proc/self/fd/<fd>
```

The normal SegStore path-confinement policy still rejects proc-FD roots.
The restore must explicitly register exactly its live directory FD; registration
is process-local, Linux-only, identity-bound, and unregisters before exit.
Symlinks beneath the registered generation remain rejected.

The canonical checkpoint verifier has a similarly explicit verify-only
`--proc-fd-root` mode. The verifier child receives only the already-open staging
directory FD, checks the descriptor identity, and scans the packet through that
FD. Arbitrary proc-FD packet paths remain invalid.

After semantic verification the consumer retains `checkpoint.json` as the
content-addressed restart anchor and runs:

```text
autoRepairDataDir(fdRoot, { sparseEvery: 16, dryRun: false })
```

That reconstructs `index.sparse`, `meta.json`, `heads.json`, and `head.txt` in
the exact owned generation. The retained manifest is not mutable authority:
its own `checkpoint_id` must validate, and that manifest authenticates the
original canonical `blocks.bin` prefix on selector-based restarts.

### Failure and crash convergence

Failed staging generations are deliberately **not recursively deleted** by v1.
The attempt closes its descriptor and reports one terminal:

- `owned_stale_generation_retained`;
- `foreign_replacement_preserved`; or
- `namespace_missing`.

Because every attempt uses a new unpredictable generation name, a stale
generation from a crash does not block the next attempt. A retry creates a new
generation and does not adopt or delete the stale one.

This is intentionally conservative: disk reclamation of stale generations is a
separate reviewed maintenance operation, not an implicit failure cleanup path.
A foreign directory installed at a prior generation pathname is never
recursively deleted by restore.

## Activation

The verified generation directory is **never renamed into `DATA_DIR`**.

Activation is split into two boundaries:

1. the restore captures the exact generation token + device + inode + checkpoint
   ID;
2. it atomically creates `DATA_DIR` as a no-replace symlink selector whose
   target is a strict metadata token, not a path.

The selector publication uses one `symlink(2)` directory-entry creation and a
parent-directory fsync. If any file, directory, or selector already occupies
`DATA_DIR`, publication fails without replacing it.

A successful parent-directory fsync is the irreversible selector commit point.
Descriptor retirement after that point is cleanup-only: directory-FD close,
generation unregister, or generation-FD close failure is surfaced as degraded
cleanup evidence but cannot downgrade the exact committed selection to a
generic pre-commit failure terminal.

A staging pathname replacement after generation capture cannot redirect the
activation effect: no staging pathname is moved.

Before selector publication, the restore child computes a deterministic
SHA-256 seal over every current directory/file name and regular-file byte
stream in the repaired generation. It sends the exact
`data_dir + generation_path + selector_target + token + device + inode +
checkpoint_id + content_seal` selection to its supervisor over IPC. A zero exit
means that exact prepared selection crossed the selector publication path.

Before node spawn, the HTTPS supervisor requires the current selector to match
that IPC selection field-for-field, opens the selected generation using
`O_DIRECTORY|O_NOFOLLOW`, requires its live device/inode to match, and
recomputes the full content seal through that already-open directory FD. Any
descendant mutation after restore verification therefore produces a HOLD before
node spawn.

The expected seal is also inherited into the node. SegStore recomputes it as its
first inherited-FD admission check, before creating WAL state or replaying
anything. This closes the parent-to-node content handoff in addition to the
selector/generation identity handoff.

The supervisor passes the already-open verified generation into `dist/index.js`
as inherited child FD 4 and sets:

```text
DATA_DIR=/proc/self/fd/4
VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1=1
VOID_SEGSTORE_INHERITED_DATA_FD_V1=4
VOID_SEGSTORE_INHERITED_DATA_DEV_V1=<captured device>
VOID_SEGSTORE_INHERITED_DATA_INO_V1=<captured inode>
```

SegStore accepts that proc-FD root only when all inherited authority fields are
present and `fstat(4)` matches the expected device/inode. Normal unregistered
proc-FD roots remain rejected, and child symlinks remain rejected.

Once the supervisor opens the generation, later namespace replacement cannot
redirect the node: the child receives the open directory description itself.
The supervisor closes only its parent copy after spawn.

When restore is explicitly enabled, an ordinary file or directory at `DATA_DIR`
is a fail-closed HOLD. Only absence or a valid checkpoint selector is accepted.
This prevents a failed/durable selector attempt from being converted on retry
into generic existing-store start authority. Restore-disabled startup preserves
the ordinary existing-store behavior.

For selector-based restarts, the restore child does **not** accept the retained
selector/manifest as self-authenticating provenance and does **not** require the
original bootstrap seed to remain online.

Restart authority is the already-merged Mainnet-0 historical cartography V1.2
acceptance object in
`public/mainnet0-historical-cartography-acceptance-v1.json`. The consumer
recomputes its content-addressed `voidm0accept1_...` identity and requires the
exact separately reviewed production anchors:

- acceptance ID
  `voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959`;
- independent Precision/Alienware authority ID
  `voidm0auth1_cdec2cadd6615cdf6c3d64765bcdca3823ff0e8c855c6316bda39c707387b8a8`;
- prefix root
  `b9c0f187688790dc32e1fea7ea3294a4540bc410131303ec7806d3c811c67dde`;
- frozen head `1951058`, exactly `1951059` blocks, `196` segment-prefix
  descriptors and `452333282` prefix bytes; and
- immutable acceptance checkpoint-descriptor SHA-256
  `6d27db0954e625d71c0abe0fb06cc2519562b8b71fe7b25ce0495079558350b8`.

Every first-restore checkpoint manifest and every retained restart manifest must
exactly reproduce all 196 reviewed segment ranges, byte counts, and SHA-256
commitments. The ordinary checkpoint semantic verifier still validates the
canonical block semantics. On restart, `verify-live-prefix` re-reads the selected
generation through its retained directory FD: completed accepted segments may
not grow, while the final accepted segment may contain a later legitimate
suffix only after its exact accepted prefix verifies.

This makes a self-consistent foreign checkpoint insufficient. An alternate
history cannot mint a fresh local trust receipt and cannot substitute its own
checkpoint ID; its bytes must reproduce the independently witnessed accepted
Mainnet-0 prefix already committed in repository source.

The ordinary launcher still prefers a live verified HTTPS/Tor transport. If no
verified transport is active, live public synchronization was not explicitly
required, checkpoint restore is enabled, and `DATA_DIR` is already a selector
symlink, `run-void-node.sh` may route to `checkpoint_local_restart`. That mode
starts no public-seed client adapter, grants no bootstrap response authority to
the node, and admits only a selector that passes the independent-prefix and
retained-prefix checks above. `VOID_PUBLIC_BOOTSTRAP_REQUIRE=1` and multipath
requirements remain authoritative and still fail when their requested live
transport is unavailable.

A newly published checkpoint outside the accepted frozen-prefix contract is an
explicit migration/authority-extension decision, not silent local adoption.

Crash/restart convergence is bounded:

- before selector publication: any unique stale generation is ignored and a
  retry creates a new generation;
- after selector publication: a restart reopens and verifies the selected
  generation by device/inode before node spawn;
- a selector whose generation path was replaced or removed fails closed and
  cannot become ordinary existing-store success.

There is no in-place population of a live store and no concurrent node process
during restore.

## Deliberately not included

This generation does not:

- enable restore by default;
- upload or publish the real checkpoint;
- configure the live seed gateway with checkpoint bytes;
- deploy or restart a service;
- restore or mutate Precision's live `data_a`;
- add checkpoint restore to Tor or multipath supervisors;
- claim #1005 external N−1 bootstrap acceptance;
- grant wallet, signer, validator, treasury, Work Credit, or funds authority; or
- move funds.

A later operational gate may enable this source primitive only after the live
checkpoint transport/publication generation is separately reviewed.


## Use-coupled inherited content authority

The aggregate content seal remains a handoff commitment, but the node does not
treat one serial filesystem walk as an atomic snapshot.

During the inherited-FD admission scan, the node records a bounded per-file
inventory containing the exact relative pathname, byte length and SHA-256 for
each regular file represented by the accepted content seal. The seal encoding
itself is unchanged.

While inherited checkpoint authority remains active:

- `heads.json` and `head.txt` are read into a bounded buffer, checked against
  that inventory, and parsed from those exact returned bytes;
- inherited `blocks.bin` reads use the same rule: the exact full segment bytes
  are size/hash checked and the requested block is parsed from that same
  buffer;
- an inherited startup never repairs mismatched head markers and never replays
  a concurrently introduced WAL; the clean checkpoint starts with an empty WAL
  directory; and
- any inherited read whose pathname is missing from the accepted inventory,
  changes generation during the read, changes size, grows past EOF, or changes
  SHA-256 fails closed.

This closes the whole-tree scan/use race without claiming that a serial double
hash is a filesystem snapshot. A same-UID writer may modify a file after that
file was visited by the aggregate scan, but those changed bytes cannot be
consumed under inherited checkpoint authority: the exact consuming read must
reproduce the scan inventory first.

The inherited handoff authority is retired at the first canonical mutation,
after the current head/existing/parent reads have already consumed verified
bytes. It is a startup handoff boundary, not a general hostile-writer runtime
sandbox. Ordinary non-inherited stores retain their existing read path.

The focused proof deterministically mutates `heads.json` after its local
hash/stamp check but before the later tree walk completes. The constructor must
HOLD before WAL directory creation or replay. Separate controls rewrite an
accepted `blocks.bin` with the same pathname/root generation and mutate
`head.txt` after construction; both must HOLD at the exact consuming read.
