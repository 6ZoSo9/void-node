# Authenticated paid-work private runtime revalidation plan v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1`

## Current source state

Current main is `68e3ef3a7c15cf5b3623555979766fadf8b670fe`.

The semantic replacement-issuance prerequisite is merged PR #972:

- reviewed head `548e7cd8842ae618eed679c7d0e59528c1a08f92`;
- merge commit `1f4b6b29fc426b0435668022e8f8162c0fef55ef`;
- preparation packet `voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d`;
- decision `HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`.

The intervening commits are:

- PR #969 Buy VOID idempotency hardening at `ac3449d113012c0d37a8b5f099e41f9d081d0279`; and
- PR #973 inactive node-hosted paid-work origin bridge at `68e3ef3a7c15cf5b3623555979766fadf8b670fe`.

Neither intervening scope owns this plan's five paths. The public bridge remains
source-only and inactive: no gateway override, SSH forward, restart, public
preflight, or authenticated submission is performed or authorized.

## Expired legacy credential boundary

The selected credential and active Work Credit binding expired at
`2026-08-05T00:00:00.000Z`. This boundary has passed. The old credential cannot support
a fresh successful runtime-revalidation observation. Separately reviewed
replacement metadata is mandatory.

## Replacement preparation truth

The merged source packet validates the closed source contracts and prepares a
sanitized issuance request, but it is a source fixture rather than live
operational evidence:

- `contracts_validated=true`;
- `producer_authentication_established=false`;
- `current_runtime_state_established=false`;
- `replacement_credential_id=null`;
- `private_credential_material_generated=false`;
- `credential_registry_write_completed=false`;
- `execution_authorized=false`.

Its proposed validity window is bounded to 30 days but is not an approval to
generate, issue, review, or register a credential.

## Ordered plan

1. `capture_current_origin_main`
2. `verify_runtime_revalidation_receipt_contracts_merged`
3. `verify_credential_rotation_contracts_merged`
4. `verify_replacement_issuance_preparation_contracts_merged`
5. `verify_disjoint_buy_void_and_inactive_public_origin_bridge_ancestry`
6. `bind_exact_source_main_preparation_packet_and_contract_lineage`
7. `verify_current_credential_and_binding_boundary_has_passed`
8. `reject_legacy_credential_for_fresh_runtime_revalidation`
9. `obtain_separate_private_replacement_issuance_authorization`
10. `generate_replacement_private_credential_material_on_nimo_only`
11. `review_replacement_and_apply_exact_append_only_credential_registry_update`
12. `restart_receiver_under_separate_operation_bound_authority`
13. `obtain_private_survey_authorization_and_revalidate_replacement_credential`
14. `retire_expired_old_binding_with_durable_evidence`
15. `bind_replacement_credential_and_verify_one_active_wc_binding`
16. `capture_sanitized_rotation_and_runtime_closeout_evidence`
17. `obtain_fresh_signatures_quote_execution_plan_and_zoso_confirmation`
18. `revalidate_origin_main_all_evidence_and_make_separate_readiness_decision`

## Authority boundary

The prior eighteen-key plan authority map remains all false. The exact nineteen
replacement-preparation authority fields also remain all false. No source merge,
packet, route, fixture, or proof grants private issuance, token generation,
credential review, registry mutation, restart, binding mutation, authentication,
paid work, payment, Work Credit writes, wallet access, signing, transaction
activity, deployment, public-route activation, or fund movement.

The current decision is:

`HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`

## Verification

```bash
python3 -m json.tool config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json
python3 -m json.tool schemas/authenticated-paid-work-private-runtime-revalidation-plan-v1.schema.json
node --check scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs
node scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1_PROOF_GREEN=true
```
