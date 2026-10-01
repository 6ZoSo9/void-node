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

- the reviewed production runtime/finality binding receipt bytes and SHA-256;
- the reviewed participant coupled-candidate promotion receipt bytes and
  SHA-256.

Both inputs must use the canonical pretty JSON serialization used by the
collector/proof path.

## Re-execution

Prepare does not trust the supplied promotion receipt.

It captures one clean repository HEAD/tree, reads the canonical coupled and
successor candidates from that exact Git generation, binds the exact promotion,
classifier, runtime-binding, and application-tool blobs, then directly
re-executes:

`buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1(...)`

The re-executed object must be exactly equal to the supplied reviewed promotion
receipt.

The inherited promotion Git subprocesses run with replacement objects disabled,
Git/config injection variables removed, and a fixed system Git PATH.

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

The canonical coupled classifier is rerun before and after. Exactly
`participant_post_purchase_voidtoken_control_required` must disappear from
the missing-gate list; ordering and every other missing gate remain unchanged.

## Application plan

The content-addressed plan binds:

- application base HEAD/tree;
- exact application/promotion/classifier/runtime-binding tool Git blobs;
- exact runtime-binding and promotion receipt SHA-256 values;
- exact coupled source and target Git-blob/SHA-256 identities;
- exact successor source Git-blob/SHA-256 identity;
- before/after classifier summaries; and
- the one reviewed promoted gate.

The tool never writes canonical source.

## Verify applied

A later reviewed Git source commit may apply the target candidate bytes.

`verify-applied` requires:

- clean canonical repository identity;
- branch `main`;
- the plan base commit to be an ancestor of current main;
- canonical origin identity `6ZoSo9/void-node`;
- current coupled source to equal the exact planned target blob/bytes;
- successor source to remain unchanged;
- application/promotion/classifier/runtime-binding tool lineage unchanged; and
- the canonical classifier to reproduce the exact planned post-state.

The resulting applied-lineage receipt still declares final coupled activation
required.

## Authority boundary

```text
source_only_application=true
exact_runtime_binding_receipt_required=true
exact_promotion_receipt_required=true
promotion_reexecution_required=true
canonical_head_candidate_bytes_required=true
reviewed_repository_generation_required=true
exact_one_gate_source_delta=true
canonical_classifier_reexecution=true
reviewed_git_commit_required=true
canonical_main_application_required=true

repository_source_write=false
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

## Verification

```bash
node scripts/prove_void_participant_postpurchase_canonical_application_v1.mjs
```

A green source proof is not a runtime-control event, token transfer, market
activation, presale activation, or final coupled activation.
