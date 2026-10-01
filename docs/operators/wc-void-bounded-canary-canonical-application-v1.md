# WC/VOID bounded-canary canonical application v1

Marker: `VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1`

Status: source-only prepare/verify contract. This mechanism does not perform the
canonical Git commit itself and does not activate WC/VOID.

## Purpose

Merged #2240 can validate an exact semantic bounded-canary artifact and prepare
candidate copies where only:

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

- the semantic bounded-canary promotion artifact accepted by #2240; and
- the exact #2240 candidate-promotion receipt.

It also reads the canonical source directly from clean `HEAD`:

- `ops/mainnet0/wc-void-production-candidate-v1.json`;
- `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`; and
- `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`.

The current repository HEAD/tree are passed back through
`promoteWcVoidBoundedCanaryCandidatesV1(...)`. The returned receipt must be
semantically identical to the supplied reviewed receipt. Therefore the
application layer does not merely trust a caller-supplied
`bounded_canary_green=true` summary.

## Base-generation binding

The plan binds:

- exact application-base HEAD and tree;
- the exact #2240 promotion-tool Git blob;
- the exact canonical-application-tool Git blob;
- source Git blob + file SHA-256 for both canonical candidates;
- successor candidate Git blob + file SHA-256; and
- exact target Git blob + file SHA-256 for both promoted candidates.

Plan validation re-reads the exact base commit from Git. Git execution uses the
reviewed executable path, disables replacement objects, strips repository/program/config
override environment, and pins every source read to one captured HEAD/tree generation.
The generation and clean-worktree state are rechecked before an artifact is returned.

A caller cannot alter a target object, recompute the plan ID, and retain validity.

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

Prepare reruns both canonical classifiers before and after the target delta.

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
canonical HTTPS repository. The returned `refs/heads/main` SHA must equal local
HEAD. Prepare itself remains network-free.

Verification requires:

- the application base is an ancestor of current HEAD;
- the application tool and #2240 tool blobs have not drifted;
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

repository_source_write=false
filesystem_write=false
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
