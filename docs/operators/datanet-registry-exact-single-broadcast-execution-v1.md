# DataNet registry exact single broadcast execution v1

Marker: `VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1`

Status: final exact single-attempt Chain-2050 submission gate for the DataNet
content-commitment registry deployment.

## Purpose

Execute at most one `eth_sendRawTransaction` attempt for the already-signed
registry deployment transaction, and only after all earlier gates have completed:

1. signed transaction verification;
2. exact transaction-bound broadcast authorization;
3. fresh read-only pre-broadcast observation; and
4. durable single-use broadcast-authorization consumption.

The executor does not sign, fund, replace, or retry a transaction.

## Required inputs

The Precision runner requires:

- exact broadcast request;
- exact broadcast authorization;
- fresh pre-broadcast observation;
- the mode-0600 signed transaction artifact;
- the canonical private broadcast state root;
- the exact operation-bound broadcast confirmation; and
- a caller-selected mode-0600 execution receipt path.

The confirmation remains:

```text
authorizeDatanetRegistryDeploymentBroadcastV1:<signed_transaction_id>:<signed_transaction_hash>:<candidate_id>:<transaction_fingerprint_sha256>
```

The runner rejects a generic authorization or any confirmation that does not
exactly match the authorization artifact. The transaction-submitting API repeats
that exact comparison internally; library callers cannot bypass the
operation-bound confirmation by skipping the Precision CLI.

### Exact Git-object launcher bootstrap

Direct mutable-worktree execution is forbidden. This form must HOLD before any
broadcast input is read:

```bash
node ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs ...
```

The supported operator bootstrap streams the exact launcher Git blob into a
sanitized Node module process. The following is the shape; substitute only the
reviewed artifact/state/output arguments and exact confirmation:

```bash
(
  set -Eeuo pipefail

  repo="$HOME/dev/void-node"
  rel="ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs"
  cd "$repo"

  git_cmd=(
    /usr/bin/env -i
    PATH=/usr/bin:/bin HOME=/nonexistent XDG_CONFIG_HOME=/nonexistent
    LANG=C LC_ALL=C
    GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
    GIT_CONFIG_NOSYSTEM=1 GIT_ATTR_NOSYSTEM=1
    GIT_NO_REPLACE_OBJECTS=1 GIT_OPTIONAL_LOCKS=0
    GIT_TERMINAL_PROMPT=0
    /usr/bin/git --no-replace-objects
    -c core.hooksPath=/dev/null
    -c core.attributesFile=/dev/null
    -c core.fsmonitor=false
    -c core.untrackedCache=false
    -c core.preloadIndex=false
    -c submodule.recurse=false
    -C "$repo"
  )

  head="$("${git_cmd[@]}" rev-parse HEAD)"
  blob="$("${git_cmd[@]}" rev-parse "$head:$rel")"

  "${git_cmd[@]}" cat-file blob "$blob" |
    /usr/bin/env -i \
      PATH=/usr/bin:/bin LANG=C LC_ALL=C \
      VOID_DATANET_REGISTRY_REVIEWED_LAUNCHER_BLOB_SHA1="$blob" \
      /usr/bin/node --input-type=module - \
        --broadcast-request /absolute/request.json \
        --broadcast-authorization /absolute/authorization.json \
        --prebroadcast-observation /absolute/observation.json \
        --signed-transaction /absolute/signed-transaction.json \
        --state-dir /absolute/private-state-root \
        --confirmation 'authorizeDatanetRegistryDeploymentBroadcastV1:...' \
        --output /absolute/private/execution-receipt.json
)
```

The streamed launcher independently requires canonical `main`, clean state,
reviewed origin and exact local/remote-main equality before it reads the signed
transaction artifact. It also requires exactly
`node --input-type=module -`, the launcher blob SHA-1 supplied by the bootstrap,
and absence of ambient Node loader/preload/proxy environment.

The shell snippet is an operator shape, not authorization to execute a real
broadcast. A real ceremony remains separately confirmed.

## Reviewed execution provenance

The streamed Precision launcher has built-in imports only before provenance.
Before it reads the signed transaction artifact or exposes the RPC capability,
it must establish one exact source authority:

1. use absolute `/usr/bin/git` with replacement objects, global/system config,
   hooks, attributes, fsmonitor, untracked cache, preload index and recursive
   submodules disabled;
2. require canonical `main`, a clean checkout including untracked files, the
   reviewed origin, and exact local `HEAD == GitHub refs/heads/main`;
3. recursively derive the broadcaster authority's complete relative import
   closure from exact captured HEAD Git objects;
4. require that closure to contain exactly 27 reviewed relative modules, with
   only the bare package `ethers`;
5. record both network-capable dependency modules explicitly instead of
   claiming a network-free closure:
   - `tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs`
     through imported Node HTTP capability; and
   - `tools/void-datanet-registry-prebroadcast-observer-v1.mjs` through
     direct/global `fetch()`;
6. materialize those exact Git-object bytes into a private temporary tree
   as an independently reverified evidence copy;
7. verify and privately materialize the reviewed `ethers` package closure using
   `VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1`, while passing the already captured
   reviewed 40-hex HEAD through profile read, installed-runtime verification,
   and materialization. Package/lock metadata must therefore match that exact
   reviewed commit even if the checkout's moving `HEAD` is transiently changed.
   The exact `node_modules/ethers` inventory is then recomputed from the same
   bounded reads used to capture `dist/ethers.min.js`;
8. register the exact reviewed source map and exact reviewed standalone
   `ethers` bundle through built-in in-memory module hooks; and
9. load the broadcaster authority from that in-memory graph rather than from a
   mutable pathname.

The launcher itself is streamed from its exact Git object. The launcher blob
SHA-1 pinned by bootstrap is carried through the entire preparation boundary:
after reviewed source/package preparation, the launcher repeats canonical
repository/remote-main authority using that same exact launcher blob before any
broadcast input is parsed or RPC submission capability is exposed.

The 27 relative
module bodies executed by the broadcaster are the exact captured Git-object
bytes supplied from memory. The reviewed-runtime helper is likewise supplied
from exact Git-object bytes through an in-memory hook. The private source tree
and reviewed package runtime remain reverified evidence copies, but are not the
execution path.

This distinction closes same-UID ABA replacement of a temporary module between
pre-import and post-import verification: temporary tree mutation cannot change
the already selected in-memory module source. Hidden worktree drift such as
`assume-unchanged`, private-tree replacement, and ancestor/worktree package
resolution therefore cannot become the selected launcher/core/package bytes.

The reviewed closure contains two modules that can perform live network
observation in other workflows (one through Node HTTP and one through global
`fetch`), so this lane intentionally reports:

```text
execution_network_isolation_provided=false
```

Those modules' presence is content-addressed; it is not treated as evidence that
the broadcaster validation path invoked either live observer. The focused proof
traps both `http.request` and `globalThis.fetch` during reviewed
source/package preparation and module import. The explicit broadcaster RPC
remains the narrow launcher-injected capability described below.

This is execution provenance, not broadcast authorization. A source-green PR or
private reviewed tree does not authorize a real registry transaction.

## Replay and crash boundary

The executor validates the immutable consumption record from:

`broadcast-consumed/<broadcast_operation_id>.json`

and requires the same state-root device/inode generation used by consumption.

Before broadcaster RPC access it exclusively publishes:

`broadcast-attempts/<broadcast_operation_id>.intent.json`

If that intent already exists, the executor refuses to call
`eth_sendRawTransaction`. This deliberately treats a crash after intent
publication as an already-spent submission opportunity rather than risking a
silent duplicate send.

The attempt directory itself is made durable by fsyncing the private state-root
directory before intent publication. The mode-0600 intent is then fsynced and its
attempt directory is fsynced before RPC. A power loss after submission therefore
cannot erase the attempt-directory entry and reopen a supposedly unused slot.

## Runtime boundary

Immediately before submission the executor rechecks:

- broadcast-authorization validity;
- pre-broadcast observation validity;
- exact state-root generation; and
- exact signed transaction/request/authorization/consumption lineage.

If that final pre-send recheck fails after the durable intent exists, the call
returns an explicit HOLD/error result with zero broadcaster/RPC-send access.
It does not continue through reconciliation as a successful broadcast attempt,
and the durable intent still prevents later replay.

The only mutating RPC method available to the launcher-injected RPC capability
is:

`eth_sendRawTransaction`

and it may be invoked at most once. The Precision HTTP client uses the pinned
loopback successor RPC with fetch redirects disabled; a 3xx redirect is an error
and signed raw bytes are never forwarded to a redirected authority.

No `eth_sendTransaction`, replacement transaction, automatic retry, signer,
wallet, credential, or private-key path exists in this gate.

## Post-attempt reconciliation

After the single send attempt the executor performs only read-only reconciliation:

- `eth_getTransactionByHash`;
- `eth_getTransactionReceipt`;
- `eth_getCode`; and
- `eth_getTransactionCount`.

It writes one mode-0600 terminal result under `broadcast-attempts/` and one
caller-selected execution receipt. A send error or ambiguous result does not
reopen the authorization.

Immediate classifications include:

- receipt success, requiring later runtime-bytecode verification;
- receipt failure, no retry;
- transaction seen with receipt pending, no retry;
- ambiguous/rejected send error, no retry; or
- submission returned without immediate confirmation, no retry.

## Proof-only adversaries

The focused repository proof does not invoke a live RPC. In addition to the
existing dependency-injected single-attempt semantics, it permanently checks:

- exact 27-module relative closure, exact `ethers` bare-package set and exact
  two-module network-capable set;
- hostile PATH/Git environment values cannot replace the absolute isolated Git
  authority;
- an `assume-unchanged` mutation of the dangerous worktree broadcaster is not
  present in the exact HEAD bytes selected for reviewed execution;
- mutation of the private reviewed source copy is detected by its Git
  blob/SHA-256 revalidation;
- a proof-only same-UID-style ABA replacement of the private broadcaster file
  during the first import window cannot execute sentinel code because execution
  is sourced from the in-memory reviewed graph;
- the reviewed `ethers` profile, package/lock metadata, installed inventory,
  and private materialization are all bound to the captured reviewed commit
  rather than a moving `HEAD`; the exact package aggregate binds the standalone
  in-memory bundle; neither source preparation nor module import performs an
  HTTP request, global fetch, RPC call, or transaction submission;
- the post-preparation repository authority check reuses the exact launcher
  Git-blob identity pinned before preparation, reaches that second check with
  external effects trapped, and performs zero RPC sends or transaction
  submission.

The proof restores its temporary worktree mutation and CI requires a clean
checkout afterwards.

## Authority boundary

A real green execution proves one submission attempt occurred. A repository
proof green proves only that the reviewed execution boundary and inert
dependency-injected semantics are coherent; it does **not** prove that a live
broadcast occurred. It does not itself
prove contract deployment finality or runtime bytecode correctness.

The expected transaction is the exact signed DataNet registry deployment:

- Chain ID 2050;
- zero native value;
- bounded gas and fee fields already authorized;
- exact predicted CREATE address already authorized;
- exact signed transaction hash already authorized; and
- no replacement transaction.

Final deployment acceptance must be derived from a later receipt/runtime
verification lane rather than from the RPC send return alone.
