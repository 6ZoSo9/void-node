# WC/VOID opening related-identity reviewer role v1

Marker: `VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ROLE_V1`

Status: **source-only reviewer trust-root decision**.

## Decision

The WC/VOID related-identity manifest reviewer is the existing WC/VOID
launch-controller EIP-712 identity:

`0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`

Existing role lineage:

`VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1`

Decision ID:

`voidwcrirr1_b0631ba09dc1009adb99f7b66a52f8e77a9636c9d611c27e67c5784f5d7cde22`

This is a narrow role selection for authenticating reviewed #2369
related-identity evidence manifests. It does not broaden the key into general
deployment, market, presale, treasury, or transaction authority.

## Required attestation binding

A later attestation verifier must bind all of:

- `manifest_id`
- `coupled_launch_id`
- `concentration_policy_id`
- `opening_window_id`
- `eligible_cohort_root`
- `cluster_assignment_root`
- `evidence_manifest_root`

Fresh launch-controller control evidence must recover the exact selected
reviewer address at attestation-evaluation time.

Address mismatch, role mismatch, expired/stale control evidence, source drift,
manifest drift, incomplete cohort evidence, or ambiguity must fail closed.

## Current HOLD

This artifact selects the reviewer trust root only.

It does not produce a reviewer signature and therefore keeps:

```text
review_attestation_verified=false
related_identity_truth_verified=false
opening_concentration_and_sybil_limits_ready=false
opening_price_acceptance_allowed=false
```

The next separate gate is an authenticated attestation format/verifier that
consumes this role decision, fresh launch-controller control evidence, and the
exact #2369 manifest.

## Authority

The role decision grants no private-key or wallet access and performs no
signing. It grants no WC ledger mutation, runtime/service mutation, transaction
construction/signing/broadcast, Chain-2050 write, deployment, inventory funding,
market activation, public presale activation, liquidity/treasury movement, or
funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_related_identity_reviewer_role_v1.mjs
```
