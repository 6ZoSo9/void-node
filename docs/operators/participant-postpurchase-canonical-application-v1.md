# Participant post-purchase canonical application v1

## Purpose

This source-only contract applies the already reviewed participant post-purchase
VOID-token-control gate to canonical **source lineage** without combining it
with final WC/VOID activation.

Merged participant promotion source can prepare a coupled-candidate copy with:

```text
gates.participant_post_purchase_voidtoken_control_ready: false -> true
```

but intentionally leaves the canonical candidate unchanged. This contract
defines the reviewed prepare / verify-applied boundary for that one source
transition.

## Exact inputs

Prepare consumes exactly:

- the finality input bytes and SHA-256;
- the public read-status transport-result bytes and SHA-256;
- the delivery receipt transport-result bytes and SHA-256;
- the control receipt transport-result bytes and SHA-256;
- the reviewed production runtime/finality binding receipt bytes and SHA-256;
- the reviewed participant coupled-candidate promotion receipt bytes and
  SHA-256.

All six inputs must use the canonical pretty JSON serialization used by the
collector/proof path. Prepare remains network-free: the public-read observations
are explicit evidence inputs.

## Reviewed execution boundary

The application tool does **not** import the authority-bearing runtime-binding,
promotion, or coupled-classifier modules from the mutable worktree.

Before re-execution it binds one clean canonical repository HEAD/tree and records
the exact Git blobs for the complete authority-bearing relative-module closure.
V1 contains 16 reviewed source modules and exactly one bare package dependency:
`ethers`.

The plan also binds the merged reviewed package runtime:

- `tools/void-reviewed-node-package-runtime-v1.mjs`;
- `ops/security/reviewed-node-package-runtime-ethers-v1.json`;
- its reviewed profile ID;
- its complete installed-package aggregate; and
- every reviewed module Git blob used by the participant authority path.

Prepare then constructs a private execution root outside the repository:

1. the reviewed package-runtime binder/profile are copied from exact HEAD Git
   objects;
2. the merged reviewed `ethers` closure is materialized and re-verified in a
   private `node_modules`;
3. a private Git repository fetches/checks out the exact reviewed local HEAD and
   verifies its tree plus all 16 authority-module blobs;
4. an ignored private runner is added under the private root; and
5. the complete execution root is made read-only before authority execution.

The private child is launched with Node's permission model and filesystem-read
authority limited to that reviewed execution root. Ambient `NODE_PATH`,
`NODE_OPTIONS`, npm prefix overrides, dynamic-loader variables, caller PATH,
Git repository-selection variables, and global/system Git configuration do not
cross the boundary.

The reviewed participant promotion needs one child-process capability for its
Git provenance reads. A recursive source census proves that this is the only
child-process surface in the 16-module closure. The child therefore receives
`--allow-child-process` together with a fixed `/usr/bin:/bin` PATH and
fail-closed Git configuration that disables replacement objects, fsmonitor,
hooks, ambient attributes, untracked-cache/index-preload behavior, and submodule
recursion.

This contract does **not** claim child socket/network confinement across
Node 22/24/26. The reviewed package-runtime contract explicitly records
`execution_network_isolation_provided=false`. This participant application
does not need a child network observation because every production observation
is supplied as reviewed evidence bytes.

## Re-execution

Inside the reviewed private execution root, prepare executes:

`buildVoidParticipantPostpurchaseProductionRuntimeBindingV1(...)`

over the exact finality/status/delivery/control inputs. The rederived
runtime-binding object must be byte-identical to the supplied reviewed
runtime-binding receipt. A self-consistent fabricated receipt is not authority.

The same private execution then runs:

`buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1(...)`

and the canonical coupled classifier before/after the promotion. The re-executed
promotion must be exactly equal to the supplied reviewed promotion receipt.

No authority-bearing function object loaded from the application tool's mutable
worktree is used for those decisions.

## Exact source delta

The prepared target must differ from the canonical coupled candidate only by:

```text
gates.participant_post_purchase_voidtoken_control_ready: false -> true
```

These remain unchanged:

```text
status=HOLD
gates.coupled_activation_ready=false
```

The canonical coupled classifier is rerun before and after in the reviewed
private execution root. Exactly
`participant_post_purchase_voidtoken_control_required` must disappear from
the missing-gate list; ordering and every other missing gate remain unchanged.

## Application plan

The content-addressed plan binds:

- application base HEAD/tree;
- exact application/promotion/classifier/runtime-binding/finality tool Git blobs;
- the full 16-module reviewed execution blob map;
- reviewed package-runtime tool/profile blobs, profile ID, and package aggregate;
- the reviewed execution-bundle content ID;
- exact finality/status/delivery/control evidence SHA-256 values;
- exact runtime-binding and promotion receipt SHA-256 values;
- exact coupled source and target Git-blob/SHA-256 identities;
- exact successor source Git-blob/SHA-256 identity;
- before/after classifier summaries; and
- the one reviewed promoted gate.

The tool never writes canonical source. It does create and remove a private,
content-verified temporary execution tree outside the repository; this is why
the authority contract records `filesystem_write=true` together with
`private_temporary_filesystem_write=true` and
`repository_source_write=false`.

## Verify applied

A later reviewed Git source commit may apply the target candidate bytes.

`verify-applied` requires:

- clean canonical repository identity;
- branch `main`;
- the plan base commit to be an ancestor of current main;
- canonical origin identity `6ZoSo9/void-node`;
- a config-isolated fixed-URL `ls-remote` of
  `https://github.com/6ZoSo9/void-node.git` whose `refs/heads/main`
  equals the exact local applied HEAD;
- current coupled source to equal the exact planned target blob/bytes;
- successor source to remain unchanged;
- application/promotion/classifier/runtime-binding/finality tool lineage
  unchanged;
- every reviewed execution-module Git blob unchanged;
- reviewed package-runtime tool/profile lineage unchanged; and
- the canonical classifier to reproduce the exact planned post-state through
  the same private reviewed execution bundle.

The resulting applied-lineage receipt still declares final coupled activation
required.

## Authority boundary

```text
source_only_application=true
exact_runtime_binding_receipt_required=true
exact_runtime_binding_evidence_required=true
runtime_binding_reexecution_required=true
exact_promotion_receipt_required=true
promotion_reexecution_required=true
canonical_head_candidate_bytes_required=true
reviewed_repository_generation_required=true
exact_one_gate_source_delta=true
canonical_classifier_reexecution=true
reviewed_git_object_execution_required=true
reviewed_package_runtime_required=true
permission_fenced_execution_required=true
ancestor_package_resolution_forbidden=true
ambient_dynamic_loader_overrides_ignored=true
execution_child_process_limited_to_reviewed_git=true
execution_network_isolation_provided=false
reviewed_git_commit_required=true
canonical_main_application_required=true
canonical_remote_main_read_required=true
external_network_read=true

repository_source_write=false
filesystem_read=true
filesystem_write=true
private_temporary_filesystem_write=true
runtime_or_rpc_write=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
token_movement=false
work_credit_mutation=false
validator_mutation=false
inventory_funding=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

The `external_network_read=true` authority applies only to the later
`verify-applied` fixed-URL canonical GitHub main check. Prepare itself performs
no network read; its reviewed execution consumes explicit evidence and local
reviewed Git/package bytes.

## Verification

```bash
node scripts/prove_void_participant_postpurchase_canonical_application_v1.mjs
```

Focused CI runs this proof on Node 22, 24, and 26 after an exact locked install,
then reruns the merged reviewed-package-runtime and participant upstream
regressions. Workflow triggers include every member of the reviewed execution
closure plus the package profile/metadata.

A green source proof is not a runtime-control event, token transfer, market
activation, presale activation, or final coupled activation.
