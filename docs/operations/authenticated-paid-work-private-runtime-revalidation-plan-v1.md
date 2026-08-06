# Authenticated paid-work private runtime revalidation plan v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1`

## Status

This document distinguishes:

1. the immutable private runtime-revalidation plan whose bytes remain fixed at
   SHA-256 `19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca`; and
2. the repaired current-main reconciliation overlay:

```text
voidapwprmr1_022752019bef74f733e97fc1ba114978a222cc7621b794193359d9831f2265ca
```

The previous reconciliation ID:

```text
voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c
```

is superseded because its proof incorrectly required the historical pre-squash
feature commit `fe5e6706d955b68d7758810d280569eaadb9ea4c` to be an ancestor of `main`.

This reconciliation is restacked on exact source main:

```text
b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e
```

The preceding four-file repair was proof-green at `dc0e3bc8edb5708dcd99d6577f80d04721ad3043`. PR #991 then advanced `main` by one path-disjoint commit and resolved the canonical issuance-plan source contract. This restack incorporates that semantic advancement without changing the immutable plan.


The current decision remains:

```text
HOLD_PENDING_SANITIZED_REQUEST_MATERIALIZATION_PRIVATE_ROTATION_AND_COMPOSED_RUNTIME_REVALIDATION
```

No credential, service, Work Credit, wallet, transaction, payment, or execution
authority is granted.

## Correct squash-merge lineage

PR #984 was reviewed at head:

```text
ec214dc27a55b96abec2e3e7be336bf29890bb1c
```

and squash-merged as:

```text
7dc10098a87dee5e27a558ef73a5ea3c52479f99
```

with exact parent:

```text
0a33693e23981457ebccde4d109571c49c9344ea
```

A squash merge does not place the feature commits or reviewed feature head in
the first-parent ancestry of `main`. Therefore:

```text
original_plan_feature_commit_required_as_main_ancestor=false
reviewed_pr_head_required_as_main_ancestor=false
pr984_squash_merge_commit_required_as_main_ancestor=true
```

The historical source commit remains recorded as provenance:

```text
fe5e6706d955b68d7758810d280569eaadb9ea4c
```

with historical parent:

```text
68e3ef3a7c15cf5b3623555979766fadf8b670fe
```

but a clean main-only checkout is not required to contain either unreachable
pre-squash object.

The repository-verifiable postmerge contract instead requires:

- PR #984 squash commit `7dc10098a87dee5e27a558ef73a5ea3c52479f99` is an ancestor of the checkout;
- the squash commit has exact single parent `0a33693e23981457ebccde4d109571c49c9344ea`;
- the squash commit subject is exact;
- the immutable plan blob at the squash commit hashes to
  `19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca`; and
- the current checkout's plan bytes equal those squash-merge bytes exactly.

This proves the merged source content without asserting an impossible ancestry
relationship.

## Original immutable source plan

The immutable plan preserves the source-only replacement-preparation contract,
the expired credential and Work Credit binding boundary, all denied authority,
and decision:

```text
HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION
```

Its source SHA-256 remains:

```text
19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca
```

The repair does not modify the immutable plan JSON, immutable plan schema, or
immutable plan proof.

## Post-expiry recovery and canonical-plan reconciliation

PR #975 merge `19a637eaa5d3c4986c922dea214a7c66ed824ca3`
remains required. A complete pre-expiry runtime receipt can no longer be
produced, and the expired credential cannot be represented as current.

PR #991 squash merge `b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e` resolves the reviewed canonical
issuance-plan source contract:

```text
canonical_issuance_plan_id=voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5
canonical_issuance_plan_resolved=true
source_request_contract_ready=true
sanitized_request_materialized=false
```

The plan fixture is:

```text
fixtures/agents/authenticated-paid-work-canonical-issuance-plan-binding-v1.example.json
```

at Git blob `21dabcb3b205c27bdc83201dbe5e77fb2187137f`. Its content-addressed body is bound to the
historical merged reconciliation ID `voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c`. That ID is
superseded only because its proof asserted impossible pre-squash main
ancestry. The canonical-plan dependency projection remains compatible with
this repaired squash-merge overlay:

```text
canonical_issuance_plan_bound_to_superseded_reconciliation_id=true
canonical_issuance_plan_compatible_with_squash_merge_ancestry_repair=true
```

The plan does not materialize an operator request or authorize private
credential generation. The next gate is:

```text
obtain_separate_authorization_to_materialize_sanitized_canonical_issuance_request
```

A `voidapwcrp1_...` rotation-plan ID remains invalid as a canonical
issuance-plan ID.

## Listener and service ownership reconciliation

PR #976 merge `dfb74b694628d66aa943e20bc97b93dede9071ae` remains required. A future `voidapwrlcb1_...`
receipt must bind the reviewed systemd user service, cgroup membership, process
start identities, exact loopback socket, owner process, socket inode, network
namespace, and absence of wildcard, non-loopback, or foreign listeners.

That receipt remains required but insufficient alone. It does not establish
producer authentication, complete runtime revalidation, replacement credential
validity, trusted context, or execution authority.

## Required composed evidence

1. `post_expiry_recovery_packet_voidapwperp1`
2. `canonical_issuance_plan_binding_voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5`
3. `sanitized_canonical_issuance_request_materialization_receipt_voidapwcir1`
4. `nimo_only_replacement_private_material_generation_receipt`
5. `append_only_replacement_credential_registry_apply_receipt`
6. `runtime_listener_cgroup_binding_receipt_voidapwrlcb1`
7. `replacement_runtime_revalidation_receipt_voidapwrr1`
8. `replacement_trusted_context_binding_voidapwrtcb1`
9. `expired_old_binding_retirement_receipt`
10. `replacement_single_active_wc_binding_closeout`
11. `fresh_provider_and_requester_signatures`
12. `fresh_quote_and_execution_plan_digests`
13. `fresh_zoso_confirmation`

## Ordered gates

1. `verify_current_main_contains_pr984_squash_merge_and_exact_parent`
2. `verify_original_plan_blob_and_sha256_preserved_without_feature_commit_ancestry`
3. `verify_post_expiry_recovery_contract_merged_and_exact`
4. `verify_runtime_listener_cgroup_binding_contract_merged_and_exact`
5. `verify_canonical_issuance_plan_binding_pr991_merged_and_exact`
6. `verify_canonical_plan_compatibility_with_squash_merge_ancestry_repair`
7. `reject_expired_credential_for_current_runtime_revalidation`
8. `require_post_expiry_recovery_packet`
9. `require_exact_reviewed_canonical_issuance_plan_id`
10. `obtain_separate_authorization_to_materialize_sanitized_canonical_issuance_request`
11. `materialize_sanitized_canonical_issuance_request_without_private_material`
12. `obtain_separate_private_replacement_issuance_authorization`
13. `generate_replacement_private_material_on_nimo_only`
14. `review_and_apply_append_only_replacement_credential_registry_update`
15. `collect_authenticated_listener_cgroup_binding_evidence`
16. `compose_replacement_runtime_revalidation_and_trusted_context_evidence`
17. `retire_expired_old_binding_and_bind_replacement_with_single_active_wc_binding`
18. `capture_fresh_signatures_quote_execution_plan_and_zoso_confirmation_then_make_separate_readiness_decision`

No gate may be skipped or inferred from a source file, historical commit label, or content address alone.

## Authority boundary

All eighteen reconciliation authority fields remain false, including private
runtime survey, credential access, private-material generation, registry writes,
service restart, binding retirement or replacement, authentication, paid-work
submission, quote acceptance, payment, work dispatch, Work Credit mutation,
wallet or signer access, signing, transaction construction or broadcast, and
fund movement.

This source repair performs no host inspection, private path or token read,
credential generation, registry write, service restart, binding mutation,
authentication, paid-work submission, payment, Work Credit write, wallet
access, transaction activity, deployment, or fund movement.


## Restacked reconciliation identifiers

```text
reconciliation_id=voidapwprmr1_022752019bef74f733e97fc1ba114978a222cc7621b794193359d9831f2265ca
reconciliation_source_main=b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e
canonical_issuance_plan_binding_merge_commit=b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e
canonical_issuance_plan_binding_reviewed_head=874bdd53eccb39e42e6a4dbf798cf3d28eca1b03
canonical_issuance_plan_id=voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5
canonical_issuance_plan_bound_private_runtime_reconciliation_id=voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c
```

## Verification

```bash
python3 -m json.tool config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json >/dev/null
python3 -m json.tool config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.json >/dev/null
python3 -m json.tool schemas/authenticated-paid-work-private-runtime-revalidation-plan-v1.schema.json >/dev/null
python3 -m json.tool schemas/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.schema.json >/dev/null
node --check scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs
node --check scripts/prove_authenticated_paid_work_private_runtime_revalidation_current_main_reconciliation_v1.mjs
node scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs
node scripts/prove_authenticated_paid_work_private_runtime_revalidation_current_main_reconciliation_v1.mjs
npm run typecheck
```

Expected markers:

```text
VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1_PROOF_GREEN=true
VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_CURRENT_MAIN_RECONCILIATION_V1_PROOF_GREEN=true
```

## Immutable-plan compatibility anchors

The squash-merge ancestry repair preserves every documentary anchor required by
the unchanged immutable-plan proof. These anchors describe historical source
lineage and fail-closed state; they grant no runtime or execution authority.

- Original source plan and inactive public-origin bridge lineage:
  `68e3ef3a7c15cf5b3623555979766fadf8b670fe`.
- Merged replacement-issuance preparation commit:
  `1f4b6b29fc426b0435668022e8f8162c0fef55ef`.
- Replacement preparation packet:
  `voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d`.
- Original immutable-plan decision:
  `HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`.
- Runtime and replacement identity remain unresolved:

```text
producer_authentication_established=false
current_runtime_state_established=false
replacement_credential_id=null
```

- The legacy credential and active Work Credit binding share the expired
  boundary `2026-08-05T00:00:00.000Z`.
- The public bridge remains source-only, inactive, and non-authorizing.
