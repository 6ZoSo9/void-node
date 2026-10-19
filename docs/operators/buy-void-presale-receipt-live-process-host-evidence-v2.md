# Buy VOID presale receipt/live-process host evidence V2

Marker:
`VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V2`.

Status: **source/CI-only repair; no Precision host collection is authorized or
performed by this source gate**.

## Purpose

V2 repairs the exact lane-1 failure observed during the separately authorized
Precision presale host-evidence retry.

The reviewed V1 collector authenticated `/run/user/1000` and its user-bus socket,
but invoked:

```text
/usr/bin/systemctl --user show void-node-live.service ...
```

from the root collector process. Precision returned:

```text
Failed to connect to bus: Operation not permitted
```

The read-only identity diagnostic then established:

```text
root_direct_valid=false
setpriv_identity_green=true
setpriv_user_valid=true
runuser_user_valid=true
setpriv_runuser_fields_equal=true
diagnosis=root_peer_credentials_rejected_runtime_identity_drop_required
```

The same diagnostic proved the accepted numeric identity-drop contract:

```text
euid=1000
egid=1000
groups=[]
CapInh=0
CapPrm=0
CapEff=0
CapBnd=0
CapAmb=0
NoNewPrivs=1
```

V2 changes only the user-systemd metadata-query boundary. Root remains required
for the protected receipt, selector, process, and source-custody observations
inherited from V1.

## Nonblocking pre-open race boundary

Reviewed source/proof reads and retained executable leases require Linux
`O_NONBLOCK` together with `O_NOFOLLOW`. Hosted proof swaps a reviewed
regular pathname to a real temporary FIFO at the exact `openSync` boundary and
requires the FIFO open to return without blocking, followed by HOLD on the
existing descriptor type/identity checks.

The special-file pre-open race remains closed. The later authenticated-module-
graph repair also closes the separate execution-generation gap: reviewed V1
code is no longer executed by reopening its pathname. This branch remains Draft
until exact-head CI and review accept the combined repair; no Precision retry is
authorized by source CI alone.

## Exact parent

V2 is stacked on the exact final V1 generation:

```text
parent_pr=#3510
parent_head=bd761f3725d2ad9ccda66819308a62cb45b39fca
parent_source_blob=ba69d46ffa6f7d178de447b469b578fa8e87ea3b
parent_proof_blob=350354779caac35d7442b1315826b8b0c27463e2
```

The future V2 host process descriptor-reads both exact parent files from the
root-custodied materialized generation, verifies their raw Git blobs, captures
and authenticates the complete V1 runtime module graph before execution, and
revalidates the visible source generations after collection.

## Runtime-user systemd adapter

V2 temporarily synchronizes a narrowly scoped replacement for Node's built-in
`spawnSync` export before importing exact V1.

Only this exact V1 invocation is intercepted:

```text
command=/usr/bin/systemctl
args=
  --user
  show
  void-node-live.service
  --property=ActiveState
  --property=MainPID
  --property=InvocationID
  --property=WorkingDirectory
  --property=NeedDaemonReload
  --no-pager
encoding=utf8
stdio=ignore,pipe,pipe
timeout=10000
```

The environment must contain exactly:

```text
PATH=/usr/bin:/bin
HOME=/nonexistent
LANG=C
LC_ALL=C
XDG_RUNTIME_DIR=/run/user/<uid>
DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/<uid>/bus
```

The adapter executes the query through root-custodied retained descriptors for
`/usr/bin/setpriv` and `/usr/bin/systemctl` with:

```text
--reuid=<runtime uid>
--regid=<runtime gid>
--clear-groups
--no-new-privs
--inh-caps=-all
--ambient-caps=-all
--bounding-set=-all
```

Before either executable lease is admitted, V2 now performs an **ACL-aware
runtime-identity nonwritability barrier**. Ownership and mode bits alone are not
accepted as proof because a root-owned mode-`0755` executable or ancestor can
still grant UID 1000 write access through a named ACL.

The barrier is bootstrapped through the collector's already-running Node
generation using `/proc/self/exe`, not through `setpriv` itself. The audit
child:

1. starts from the current Node executable;
2. clears supplementary groups;
3. drops to the reviewed runtime UID/GID;
4. proves exact real/effective UID/GID and empty supplementary groups; and
5. requires `W_OK` denial for both executable leaves and every ancestor of
   `/usr/bin/setpriv` and `/usr/bin/systemctl`.

Only after that effective-access barrier passes are the existing
`O_NOFOLLOW|O_NONBLOCK` retained executable leases opened. The descriptors
remain the execution authority. `setpriv` is launched from its **parent-visible
retained descriptor pathname** `/proc/self/fd/<setpriv-parent-fd>`, avoiding
the non-portable assumption that child fd 3 already exists when the spawn
executable is resolved. The exact retained `systemctl` descriptor is mapped to
child fd 4 so the already-running setpriv process can exec `/proc/self/fd/4`
after dropping identity. Both retained generations are revalidated against their
visible paths after the child exits.

This closes the named-ACL variant of the executable substitution boundary. A
runtime-writable executable leaf or ancestor HOLDS before any root
`setpriv` execution.

Every non-systemctl `spawnSync` call passes through unchanged. The built-in
export is restored in `finally` after either success or failure, and nested
patch activation is rejected.

## Working-directory canonicalization

The diagnostic reported:

```text
WorkingDirectory=/opt/void-node-live/current
```

V1 compares that systemd field against `realpath(/proc/<pid>/cwd)`. The process
cwd resolves to the retained release directory, not the `current` symlink.

V2 therefore canonicalizes only the returned `WorkingDirectory` field after:

1. requiring an absolute canonical input spelling;
2. verifying every parent directory is root-owned and not group/other-writable;
3. verifying the visible leaf is a root-owned directory or symlink;
4. resolving the target through `realpath`;
5. verifying the resolved directory and all ancestors are root-custodied; and
6. reobserving the visible leaf and resolved target generation.

All other systemctl fields are passed through exactly. V2 requires exactly three
successful systemd queries, matching the exact pinned V1 collection sequence.

## Inherited evidence contract

After the query adapter is installed, exact V1 remains the execution engine.
V2 requires V1's complete positive evidence contract, including:

- authenticated deployment receipt verification;
- retained deployment-receipt descriptor custody;
- same-live-process selector generation verification;
- installed live-process receipt exact-byte equality;
- source-custody requalification;
- pre/post process and systemd generation stability; and
- terminal selector verification after the final receipt read.

V2 also rejects any V1 result that changes the negative authority contract.

## Executable ACL evidence

A future GREEN V2 receipt additionally requires:

```text
user_systemd_query_executable_acl_runtime_nonwritability_verified=true
user_systemd_query_executable_acl_audit_path_count>=5
```

The count includes both reviewed executable leaves plus their deduplicated
canonical ancestors. This evidence is specifically about the runtime identity's
effective write access; it does not claim that arbitrary privileged identities
cannot mutate the host.

## Authority

Even a future GREEN V2 host receipt keeps false:

```text
process_environment_read_performed
filesystem_write_performed
network_contact_performed
receipt_publication_performed
receipt_retirement_performed
service_mutation_performed
credential_access
wallet_or_signer_access
signing
transaction_submission
payment_acceptance
public_presale_activation
wc_void_market_activation
treasury_or_liquidity_action
funds_movement
production_host_evidence_authority
```

This source gate does not run Precision, restart a service, reload systemd,
read process environment, access credentials or keys, accept payment, activate
the presale/WC market, execute the custody rollback challenge, mutate storage,
or move funds.

A future Precision retry remains separately operation-bound.

**PROTECT THE CORE.**


## Authenticated V1 execution graph

The V2 repair does not re-import the verified V1 source by pathname.

Before any inherited V1 code executes, it descriptor-reads and Git-blob
authenticates the complete reviewed 13-module local TypeScript closure. Dynamic
`import()` / `require()` and non-`node:` bare imports are refused. Only reviewed
relative modules in the pinned closure and the exact reviewed Node built-in
import set are admitted.

The authenticated bytes are converted to executable ESM entirely in memory with
Node's built-in TypeScript stripper. Reviewed relative imports are recursively
rewritten to content-derived `data:` module URLs; `import.meta.url` is replaced
with each module's reviewed original file URL before stripping so ROOT and
direct-entry semantics remain faithful. The parent V1 module is therefore
executed from authenticated retained bytes, not by reopening its pathname.

After collection, every one of the 13 visible source generations is revalidated
against the generation that supplied the executed bytes. A path replacement can
cause HOLD, but cannot substitute already-executed code.

The self-test executes the same graph engine on a fixed two-module in-memory
fixture and rejects a dependency blob mutation. Hosted proof also pins all 13
production closure blobs and forbids the historical pathname import.

This closes only source-execution generation binding. All existing host,
credential, payment, signing, transaction, activation, treasury and funds
authority remains unchanged.


## Exact-head P1 execution binding update

The authenticated graph implementation now exposes a CI-only execution helper
using the same production graph engine. Hosted proof builds a map from the exact
13 production module blobs and executes the real V1 entry from authenticated
in-memory bytes. It requires the expected V1 marker and collector export.

This supplements the synthetic two-module graph test and ensures the real
closure, built-in TypeScript transform, import rewriting, and data-URL size
boundary are exercised on every Node 22/24/26 lane before this source can be
considered clear.

No host collection or runtime/economic authority is added.
