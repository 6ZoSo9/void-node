# Buy VOID enforcement dynamic tool source identity candidate V1

## Scope: source observation, not executable authentication

This separate source-only Draft is stacked on exact [#2641](https://github.com/6ZoSo9/void-node/pull/2641)
head `ad5192933e2f8c538bab041bb6d9a164fd67e880`, which in turn
is based on the [#2638](https://github.com/6ZoSo9/void-node/pull/2638)
V6 runtime bridge at `320ab95af3998a9dcfddd44d62c394c19ba7ea2c`.

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
successor. The checked-entry locked V4 sibling [#2639](https://github.com/6ZoSo9/void-node/pull/2639)
also requires lineage reconciliation. Historical attestations stay immutable.

No runtime service, signer, keys, customer ledger, RPC, payment, transaction,
Chain-2050/WC, presale/market, custody, treasury/liquidity or funds action.
No Ready, merge or deployment.

**PROTECT THE CORE.**
