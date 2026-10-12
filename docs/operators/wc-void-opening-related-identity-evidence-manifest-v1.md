# WC/VOID opening related-identity evidence manifest v1

Marker: `VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1`

Status: **source-only unsigned evidence-manifest compiler**.

This contract is the privacy-preserving prerequisite for #2365. It does not
choose concentration percentages and it does not claim that VOID has proven
one-human-one-key or that no undisclosed relationship exists.

## Purpose

The existing concentration/Sybil evaluator can already perform deterministic
share arithmetic over one cluster assignment per eligible opening participant,
but it intentionally keeps:

```text
related_identity_truth_verified=false
opening_concentration_and_sybil_limits_ready=false
opening_price_acceptance_allowed=false
```

because caller-supplied cluster labels are not evidence.

This manifest contract closes the next narrower boundary:

1. re-run the existing opening participant provenance/eligibility verifier;
2. bind the exact eligible cohort to a content-addressed cohort root;
3. require exactly one cluster assignment for every eligible participant;
4. derive every cluster ID from its exact sorted participant set;
5. bind every assignment to actual content-addressed evidence bytes;
6. reject evidence that names a participant assigned to a different cluster;
7. reject unreferenced evidence documents;
8. surface ambiguity explicitly; and
9. produce an unsigned content-addressed manifest for later reviewer
   attestation.

## What this does not prove

A complete manifest is **not** related-identity truth.

The strongest complete result is:

```text
status=RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD
ready_for_review_attestation=true
reviewer_role_decision_required=true
review_attestation_verified=false
related_identity_truth_verified=false
opening_concentration_and_sybil_limits_ready=false
opening_price_acceptance_allowed=false
opening_price_acceptance_hold=related_identity_review_attestation_required
```

The reviewer/signer role is intentionally not selected here. #2365 has already
identified existing VOID trust roots that could potentially perform that role,
but source must not silently repurpose either one.

A later separately reviewed role/attestation verifier must authenticate the
manifest before any live path may set
`related_identity_truth_verified=true`.

## Exact eligible cohort

The compiler does not trust a caller-provided cohort summary.

It consumes the same exact inputs as
`verifyWcVoidOpeningParticipantProvenanceEligibilityV1(...)`:

- coupled launch ID;
- opening commitments;
- production-WC provenance records; and
- participant eligibility records.

The existing verifier is rerun. Its canonical records are then hashed into:

```text
eligible_cohort_root
```

The participant provenance policy ID is also carried in the output.

The opening contract already rejects duplicate participant IDs, so each eligible
participant appears exactly once in this manifest.

## Cluster IDs

Cluster labels are not free-form.

A cluster ID is:

```text
sha256(canonical({
  schema: "void.wc-void-opening-related-identity-cluster.v1",
  participant_ids: sorted_unique_participant_ids
}))
```

The compiler recomputes this ID from the final assignment set. This prevents a
caller from changing cluster membership without changing the cluster identity.

## Evidence documents

Every assignment references exactly one content-addressed evidence document.
Evidence documents contain:

- cluster ID;
- evidence kind;
- decision basis;
- exact participant subjects;
- SHA-256 of the supplied evidence bytes;
- byte length; and
- privacy class
  `void_control_evidence_non_personal_v1`.

The raw evidence bytes are consumed only to verify their SHA-256/content ID.
They are not copied into the returned manifest.

Allowed evidence kinds are deliberately narrow:

- `void_key_control_linkage_v1`
- `void_credential_control_linkage_v1`
- `participant_opt_in_linkage_v1`
- `reviewed_cluster_boundary_evidence_v1`

The first three may support a `common_control` decision. The boundary evidence
kind is required for a `distinct_cluster_boundary` decision.

Forbidden implicit truth includes:

- IP address or geolocation correlation;
- device/browser fingerprinting;
- browsing/social-graph deanonymization;
- race, religion, politics, health, sex life, or other sensitive traits; and
- self-declared cluster labels with no admitted evidence bytes.

The compiler itself does not adjudicate whether the evidence is persuasive.
That remains the later authenticated review step.

## Cluster completeness rules

For every eligible participant:

- exactly one commitment assignment is required;
- exactly one participant assignment is required;
- the referenced evidence must include that participant;
- the evidence cluster must equal the assignment cluster.

For every multi-participant cluster, at least one
`common_control` evidence document must cover the entire cluster participant
set.

For every singleton cluster, at least one
`distinct_cluster_boundary` document must cover that participant.

Every evidence document included in the manifest must be referenced and all of
its participant subjects must actually be assigned to its stated cluster.

## Ambiguity

An assignment may explicitly carry:

```text
ambiguous=true
```

This does not throw away the evidence. Instead the manifest remains
content-addressed but reports:

```text
status=RELATED_IDENTITY_EVIDENCE_MANIFEST_AMBIGUOUS_HOLD
ambiguous_participant_count>0
ready_for_review_attestation=false
related_identity_truth_verified=false
opening_price_acceptance_allowed=false
opening_price_acceptance_hold=related_identity_evidence_ambiguous
```

Absence of a detected relationship is never silently upgraded to proof of
independence.

## Content-addressed output

The result binds:

- coupled launch ID;
- concentration policy-contract ID;
- selected concentration policy ID;
- opening window ID;
- participant-provenance policy ID;
- eligible cohort root;
- cluster assignment root;
- evidence manifest root;
- participant/cluster/evidence counts;
- canonical assignments; and
- canonical evidence summaries.

The final manifest ID is:

```text
voidwcriem1_<sha256(canonical_manifest_material)>
```

Changing cohort membership, cluster membership, evidence bytes, evidence type,
ambiguity, or policy/window binding changes the content ID.

## Authority

This lane grants no:

- reviewer/signing authority;
- wallet/signer/private-key access;
- participant deanonymization;
- WC ledger write or balance mutation;
- runtime/service mutation;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- inventory funding;
- liquidity movement;
- market or presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_related_identity_evidence_manifest_v1.mjs
```
