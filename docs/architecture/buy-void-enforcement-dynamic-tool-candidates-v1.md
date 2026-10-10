# Buy VOID enforcement dynamic tool source identity candidate V1

## Scope: source observation, not executable authentication

This separate source-only Draft is stacked on exact [#2641](https://github.com/6ZoSo9/void-node/pull/2641)
head `ad5192933e2f8c538bab041bb6d9a164fd67e880`, which in turn
is based on the [#2657](https://github.com/6ZoSo9/void-node/pull/2638)
V6 runtime bridge at `32f40899d6b71561bf4bf3a917e51c431cb867de`.

PR #2641's initial enforced AST-closed import scanner correctly HELD
because it discovered real code-generated ESM imports:
`new Function("specifier", "return import(specifier)")`.
Its current successor reports those edges as UNQUALIFIED. A static relative
import graph is not the entire runtime executable dependency graph.

This follow-up checks original source bytes of **thirteen** caller modules
and their three **literal** candidate external tools without executing any
real VOID dynamic tools. The candidate file identities are:

- `tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`: Git blob
  `d6a2d1cd82e5e255f435c1e21d1783774a44b2b1`.
- `tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs`:
  `70cd6ea46abecf82beb498cf61dabced2cf37084`.
- `tools/buy-void-prepared-transaction-custodian-service-v1.mjs`:
  `ccf31c736ed125b0bd3e977a8c734b9e9ae67b33`.

Nine caller source files name the saga, three the broadcaster service,
and one the custodian service. The exact caller module Git blobs are also
pinned. This larger source census does **not** claim every caller is reachable
from the current static enforcement runtime entrypoint; that must be
established in a separate dynamic closure acceptance.

## Git evidence execution boundary

The independent [P2 Git executable trust review](https://github.com/6ZoSo9/void-node/pull/2642#pullrequestreview-5460686963)
found that the original ancestry and changed-input assertions used
`execFileSync("git", ...)`, accepting an arbitrary `git` shim through the
caller-controlled `PATH` and arbitrary inherited `GIT_*` / `LD_*` process
configuration. A fake executable returning status zero can falsify ancestry
assertions even though independently SHA-1-pinned source bytes still HOLD.

This scoped successor adds a separate
`scripts/prove_buy_void_reviewed_git_invocation_v1.mjs` module. The source
verifier now calls the **same imported helper** for both ancestry and Git
diff; it never resolves Git through ambient `PATH`. The helper requires a
root-owned, non-symlink, non-group/other-writable and executable Linux
`/usr/bin/git` file, and starts it with a fixed minimal child environment.
It excludes all inherited `GIT_*`, `NODE_OPTIONS`, `LD_*` and arbitrary
preloads; disables system/global Git configuration, replace objects,
fsmonitor and hooks, and invokes diff with `--no-ext-diff --no-textconv`.
The exact Git executable bytes are **not independently digest-pinned**.
This is a declared trusted **GitHub Ubuntu Linux runner operating-system
boundary**, not a general operator-host/compromised-root proof.

The identical production helper's disposable temp-repository self-test
creates a fake `git` executable at the front of ambient `PATH`, hostile
Git config and an `LD_PRELOAD` path. It proves the shim is **never executed**,
qualifies a valid ancestry, rejects reversed/invalid ancestry and detects a
real committed source change, while an unrelated source path still passes.
It restores the parent environment and deletes every disposable fixture
without touching any VOID repository/ref or Git configuration.

The existing exact-head Node 22/24/26 workflow runs that negative test
both directly and from the candidate scanner's `--self-test`, before
deriving the same source-only JSON. It explicitly watches changes to the
new Git helper. The source report's three tool identities, 13 callers,
byte format and all production/acceptance FALSE flags are unchanged.

## What this proof does

A separate TypeScript AST parser requires each source caller to have exactly
one generated `Function` importer and one literal,
`../../tools/buy-void-...-vN.mjs` argument. It separately resolves
the source and emitted `dist/economic` directory geometry to the identical
canonical relative `tools/` target path. Every target byte is read through
an O_NOFOLLOW retained descriptor with before/after visible file identity,
single-link regular-file requirements and pre-size+one-byte bound, then
validated against the reviewed Git blob. Each target .mjs source is inspected
for its observed static external imports (Node builtins and locked `ethers`).
Unrecognized relative imports, nonliteral dynamic imports and new
`Function`/eval/require loaders in those tool files HOLD.

The `--self-test` creates **only OS temporary synthetic ESM files** and
runs a benign fixture through the same generated-`Function` expression
from differing working directories. It shows a relative tool import loads
a fixture at the expected root `tools` path; replacing that fixture's
source on disk causes the next process to import *different* bytes, proving
why source path/caller literals are **not** sufficient runtime identity.
No real broadcaster, custodian, saga, signer or wallet source is imported or
executed in the test.

Exact-head GitHub Actions independently runs Node 22, 24, 26 with locked
TypeScript and performs the synthetic self-test plus read-only 13-caller,
3-target source byte audit. The cross-node job requires three emitted
candidate JSON reports to be byte-for-byte identical. This is reproducible
candidate source evidence only, not a locked production artifact.

## Non-authority invariants

The report explicitly keeps:
```text
source_target_files_git_blobs_verified=true
actual_compiled_importer_execution_qualified=false
executed_target_verified=false
dynamic_tool_transitive_closure_verified=false
complete_executable_closure_verified=false
candidate_identity_accepted=false
deployed_artifact_generation_verified=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

A later independent reviewer must authenticate actual emitted caller byte
identities, Node's code-generated import resolution in the packaged image,
immutable target bytes, imported external modules, all transitive dependencies
and side-effect controls *before* qualifying a locked V5 enforcement
successor. The checked-entry locked V4 sibling [#2636](https://github.com/6ZoSo9/void-node/pull/2639)
also requires lineage reconciliation. Historical attestations stay immutable.

No runtime service, signer, keys, customer ledger, RPC, payment, transaction,
Chain-2050/WC, presale/market, custody, treasury/liquidity or funds action.
No Ready, merge or deployment.

**PROTECT THE CORE.**


## Composed-source read boundary

This successor is rederived from exact composed source head `32f40899d6b71561bf4bf3a917e51c431cb867de`
and does not inherit the older #2642 source-generation claim.

All reviewed tool/caller source bytes are opened through the parent
descriptor-relative Linux reader. Each path component is traversed from
retained `O_DIRECTORY|O_NOFOLLOW` descriptors, the leaf is read through a
bounded retained descriptor, and visible-path/descriptor identities are
rechecked. The focused workflow runs the reader's ancestor-substitution and
growth adversaries before the candidate source census.

Reviewed Git ancestry/diff checks continue through the parent closed
`/usr/bin/git` helper with a fixed child environment.

This qualifies source identity only. Real tool targets are not executed and
`executed_target_verified`, `dynamic_tool_transitive_closure_verified`,
`complete_executable_closure_verified`, `candidate_identity_accepted`,
deployment, production source-finality, presale and funds flags remain false.
