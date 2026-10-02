# WC/VOID bounded-canary canonical application v1

Marker: `VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1`

Status: source-only prepare/verify contract. This mechanism does not perform the
canonical Git commit itself and does not activate WC/VOID.

## Purpose

Merged #2237 can rederive the semantic bounded-canary artifact from its exact
upstream evidence byte set. Merged #2240 can then validate that rederived semantic
artifact and prepare candidate copies where only:

- production `bounded_canary_green: false -> true`; and
- coupled `gates.bounded_canary_green: false -> true`

change.

#2240 deliberately leaves the canonical candidate files unchanged. This
contract supplies the missing reviewed bridge for #2253 without combining the
later final `coupled_activation_ready` transition.

## Why this is a prepare + verify-applied split

Two canonical JSON files must change together as one reviewed repository
transition. This tool does not invent a second filesystem transaction protocol.

Instead:

1. **prepare** re-executes #2240 against the exact clean repository generation,
   exact semantic-promotion bytes, and exact reviewed #2240 receipt;
2. prepare emits a content-addressed application plan containing the exact
   target objects, file SHA-256 values, and Git blob identities;
3. a dedicated reviewed Git commit/PR applies exactly those two candidate-file
   targets;
4. **verify-applied** proves the committed generation matches the prepared plan
   and emits the lineage receipt for #2200.

The tool never writes repository files.

## Prepare inputs

Prepare requires exact bytes + SHA-256 for:

- the supplied semantic bounded-canary promotion artifact;
- all nine #2237 semantic-origin inputs: first-stage bounded-canary input,
  market-vault at-use evidence, ledger-persistence import input, opening request,
  opening claim binding, opening-claim persistence receipt, opening replay capsule,
  opening-replay inspection receipt, and participant at-use evidence; and
- the exact #2240 candidate-promotion receipt.

The reviewed policy ID and semantic evaluation time are derived from the bounded-canary
input. The application parent no longer imports #2237/#2240/classifier authority from
the mutable worktree. It captures one clean HEAD/tree, recursively binds the complete
reviewed relative-module closure to exact Git blobs, materializes the reviewed
`ethers` package closure using the reviewed Node package-runtime profile, and runs
semantic rederivation + #2240 candidate promotion + before/after classifiers only from
a private detached exact-HEAD tree under the Node permission model.

The resulting pretty-JSON semantic artifact must be byte-identical and semantically
identical to the supplied semantic promotion. A self-consistent fabricated semantic
receipt is therefore not sufficient.

It also reads the canonical source directly from clean `HEAD`:

- `ops/mainnet0/wc-void-production-candidate-v1.json`;
- `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`; and
- `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`.

Only after #2237 semantic-origin reexecution succeeds are the current repository
HEAD/tree and the freshly rederived semantic bytes passed through
`promoteWcVoidBoundedCanaryCandidatesV1(...)`. The returned #2240 receipt must be
semantically identical to the supplied reviewed receipt. Therefore the application
layer trusts neither a caller-supplied `bounded_canary_green=true` summary nor a
self-content-addressed semantic receipt without its origin evidence.

## Base-generation binding

The plan binds:

- exact application-base HEAD and tree;
- the exact #2240 promotion-tool Git blob;
- the exact canonical-application-tool Git blob;
- the complete reviewed authority-module Git-blob map;
- reviewed Node package-runtime tool/profile Git blobs;
- reviewed package-runtime profile ID + aggregate package SHA-256;
- permission-fenced execution / ancestor-package-resolution facts;
- source Git blob + file SHA-256 for both canonical candidates;
- successor candidate Git blob + file SHA-256; and
- exact target Git blob + file SHA-256 for both promoted candidates.

Plan validation re-reads the exact base commit from Git. Authority-bearing Git
uses the reviewed executable path under a minimal explicit subprocess environment;
it does not inherit ambient process loader/tool state. Global/system Git config is
disabled, replacement objects are disabled, and every local read forces
`core.fsmonitor=false`, hooks/ambient attributes off, untracked-cache/preload-index
off, and submodule recursion off. Every source read remains pinned to one captured
HEAD/tree generation, which is rechecked with clean-worktree state before an artifact
is returned.

A caller cannot alter a target object, recompute the plan ID, and retain validity.

## Reviewed execution boundary

The authority-bearing execution closure starts from
`tools/void-wc-void-bounded-canary-reviewed-execution-v1.mjs` and is discovered
recursively from exact HEAD Git-object bytes. Relative `.mjs` imports are included
automatically. Bare package imports are forbidden except reviewed `ethers`.

The exact reviewed Node package-runtime tool/profile is copied from the same HEAD,
verifies the locked installed `ethers` bytes, and materializes them privately outside
the repository. A private detached checkout of the exact application HEAD is then
created beneath that package root. The private parent directory identity plus bootstrap,
runtime-tool, profile, generated-runner, and every reviewed module byte identity are
revalidated before package verification and again immediately before child spawn.
The reviewed bridge executes there under `node --permission` with filesystem reads
limited to the private reviewed root.
Child process is enabled only because the reviewed #2240 promotion performs its own
hardened read-only Git provenance checks.

The parent application tool itself is also compared byte-for-byte by Git blob identity
against `HEAD:tools/void-wc-void-bounded-canary-canonical-application-v1.mjs`
before authority execution and again when repository stability is rechecked.

The reviewed closure also records the exact sorted set of network-capable imported
modules in the content-addressed plan. Those modules may expose live-observer functions
that are not invoked by this evidence-only path. Their presence is therefore explicit
lineage, not a claim of network isolation.

Private temporary filesystem writes are therefore expected and explicitly recorded;
`repository_source_write=false` remains true. The reviewed runtime does not claim a
socket/network sandbox: `execution_network_isolation_provided=false`.

## Exact allowed source delta

Production candidate:

```text
bounded_canary_green: false -> true
```

Coupled candidate:

```text
gates.bounded_canary_green: false -> true
```

No other field may change.

In particular, both must remain:

```text
production status = "hold"
production coupled_activation_ready = false
coupled status = "HOLD"
coupled gates.coupled_activation_ready = false
```

All authority objects remain false.

## Classifier requirement

Prepare reruns both canonical classifiers before and after the target delta inside
the same reviewed exact-HEAD execution environment used for semantic/promotion
rederivation.

The before states must be HOLD and contain
`bounded_canary_required`.

The after states must still be HOLD and their missing-gate lists must equal the
before lists with exactly one entry removed:

```text
bounded_canary_required
```

No other missing gate may disappear.

## Application plan

A successful prepare emits:

```text
marker=VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1
status=CANONICAL_BOUNDED_CANARY_APPLICATION_PREPARED
bounded_canary_green=true
production_status_remains_hold=true
coupled_status_remains_hold=true
coupled_activation_ready=false
reviewed_git_commit_required=true
```

The plan ID is:

```text
voidwcbcap1_<sha256(canonical plan material)>
```

The plan contains the exact target candidate objects for the reviewed Git
transition.

## Applying the plan

The actual source transition is a separate reviewed Git commit/PR. It must
replace only the two candidate files with the exact pretty-JSON target objects
from the plan.

Do not:

- set either `coupled_activation_ready` field true;
- change candidate status;
- mix vault/funding/ledger/claim/participant/successor truth into this commit;
- run a service or host mutation;
- treat a fixture promotion as live evidence.

This source mechanism is useful before live evidence exists, but canonical
candidate source must not be changed until the actual semantic-promotion and
#2240 receipt bytes have been reviewed.

## Verify-applied

After the reviewed candidate commit lands, run `verify-applied` from a clean
canonical `main` generation. A feature branch may prove the target objects with the
pure state verifier, but it cannot emit canonical applied lineage.

The final verifier also requires `origin` to identify
`6ZoSo9/void-node` and performs a read-only `git ls-remote` against the fixed
canonical HTTPS repository. That fixed-URL remote read does not use repository
discovery and runs with the same minimal environment, global/system Git config
disabled, interactive prompting disabled, replacement objects disabled, local
execution/cache features fenced, and `http.sslVerify=true`. Repository-local URL
rewrites, ambient loader/config injection, TLS relaxation, or transport helpers
therefore cannot redirect the canonical check.
The returned `refs/heads/main` SHA must equal local HEAD. Prepare itself remains
network-free.

Verification requires:

- the application base is an ancestor of current HEAD;
- the application parent tool bytes match its current HEAD Git blob;
- the application tool, #2240 tool, complete reviewed module closure, and reviewed
  package-runtime lineage have not drifted;
- both canonical candidate blobs/file SHA-256 values exactly equal the prepared
  target identities;
- the successor candidate remains exactly the prepared source identity;
- both classifier after-states exactly match the plan; and
- final activation remains HOLD.

A green applied receipt reports:

```text
status=CANONICAL_BOUNDED_CANARY_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD
bounded_canary_green=true
coupled_activation_ready=false
exact_two_gate_source_application_verified=true
final_coupled_activation_required=true
```

Its content-addressed `voidwbcaa1_...` lineage is the input #2200 should use
before the final SOURCE_READY transition is considered.

## CLI

Prepare:

```bash
node tools/void-wc-void-bounded-canary-canonical-application-v1.mjs prepare \
  --semantic /absolute/semantic-promotion.json \
  --semantic-sha256 <64hex> \
  --bounded-canary-input /absolute/bounded-canary-input.json \
  --bounded-canary-input-sha256 <64hex> \
  --market-vault-at-use /absolute/market-vault-at-use.json \
  --market-vault-at-use-sha256 <64hex> \
  --ledger-persistence-import-input /absolute/ledger-import.json \
  --ledger-persistence-import-input-sha256 <64hex> \
  --opening-request /absolute/opening-request.json \
  --opening-request-sha256 <64hex> \
  --opening-claim-binding /absolute/opening-claim.json \
  --opening-claim-binding-sha256 <64hex> \
  --opening-claim-persistence-receipt /absolute/claim-persistence.json \
  --opening-claim-persistence-receipt-sha256 <64hex> \
  --opening-replay-capsule /absolute/replay-capsule.json \
  --opening-replay-capsule-sha256 <64hex> \
  --opening-replay-inspection-receipt /absolute/replay-inspection.json \
  --opening-replay-inspection-receipt-sha256 <64hex> \
  --participant-at-use /absolute/participant-at-use.json \
  --participant-at-use-sha256 <64hex> \
  --promotion /absolute/candidate-promotion.json \
  --promotion-sha256 <64hex>
```

The JSON result is printed to stdout. Redirecting stdout to a file is an
operator/shell action; the tool itself does not write.

After the reviewed Git application:

```bash
node tools/void-wc-void-bounded-canary-canonical-application-v1.mjs verify-applied \
  --plan /absolute/application-plan.json \
  --plan-sha256 <64hex>
```

## Authority boundary

```text
source_only_application=true
exact_semantic_promotion_bytes_required=true
exact_semantic_origin_inputs_required=true
semantic_promotion_reexecution_required=true
semantic_promotion_equality_required=true
exact_candidate_promotion_receipt_required=true
candidate_promotion_reexecution_required=true
canonical_head_candidate_bytes_required=true
reviewed_repository_generation_required=true
canonical_classifier_reexecution=true
exact_two_gate_source_delta=true
reviewed_git_commit_required=true
canonical_main_application_required=true
canonical_github_origin_required=true
canonical_remote_main_read_required=true
reviewed_git_executable_required=true
ambient_git_overrides_ignored=true
reviewed_git_object_execution_required=true
reviewed_module_closure_required=true
reviewed_package_runtime_required=true
permission_fenced_execution_required=true
ancestor_package_resolution_forbidden=true
worktree_authority_execution_forbidden=true
private_temporary_filesystem_write=true
execution_network_isolation_provided=false

repository_source_write=false
filesystem_write=true
runtime_mutation=false
service_mutation=false
rpc_call=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
wc_ledger_write=false
wc_balance_mutation=false
token_movement=false
inventory_funding=false
liquidity_movement=false
coupled_activation=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

Focused verification:

```bash
node scripts/prove_void_wc_void_bounded_canary_canonical_application_v1.mjs
```

The proof installs hostile repository-local and ambient global `core.fsmonitor`
sentinels plus dynamic-loader debug variables, tampers with installed `ethers`
bytes, hides an authority-module worktree mutation with `assume-unchanged`, and
hides a parent-tool mutation the same way. Reviewed execution must fail closed on
package drift, ignore mutable authority worktree bytes, reject parent-tool byte drift,
and preserve the exact two-gate plan semantics.
