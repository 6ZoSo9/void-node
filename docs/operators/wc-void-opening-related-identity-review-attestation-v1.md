# WC/VOID opening related-identity review attestation v1

Marker: `VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1`

Status: **source-only EIP-712 attestation preparation and verifier**.

This lane stacks on the reviewer-role decision in #2375. It does not contain,
read, or generate the production reviewer's private key.

## Signed material

The EIP-712 message binds:

- reviewer-role decision ID;
- exact selected reviewer address;
- fresh launch-controller control-evidence ID;
- related-identity manifest ID;
- coupled-launch ID;
- concentration-policy ID;
- opening-window ID;
- eligible-cohort root;
- cluster-assignment root;
- evidence-manifest root;
- exact reviewed #2369 manifest-compiler Git blob `7bb5c54fcd6a0d188b90c4c17d06145fe792ce66`;
- issued/expiry timestamps; and
- a 32-byte nonce.

The EIP-712 domain is separate from launch-controller control verification:

`VOID WC/VOID Related Identity Review Attestation`

This prevents a control-proof signature from being replayed as a review
attestation.

## Required production verification

The production wrapper requires:

1. the exact #2375 reviewer-role decision;
2. a #2369 manifest in
   `RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD`;
3. full cohort coverage and zero ambiguous participants;
4. a content-addressed manifest ID matching the exact manifest material;
5. independent revalidation of canonical cluster IDs, evidence IDs, assignment/evidence ordering, cluster-assignment root, and evidence-manifest root;
6. exact current source binding to the reviewed #2369 compiler Git blob `7bb5c54fcd6a0d188b90c4c17d06145fe792ce66`; the verifier does **not** import or execute the compiler worktree module, and instead independently revalidates its pinned marker, authority snapshot, cluster-ID derivation, assignments, evidence IDs/roots and manifest ID;
7. exact reviewed Git-blob execution of the opening-window, commitment, production-WC exclusion, participant-provenance eligibility, concentration-policy, and concentration-policy-contract verifier closure; mutable worktree copies are not execution authority;
8. re-verification that the supplied opening-window body derives the manifest window ID and admits the exact commitment set;
9. re-verification that the supplied concentration-policy body derives the manifest policy ID, binds the same launch/window, matches the reviewed policy contract, and was committed before opening;
10. re-verification of the exact commitments, production-WC provenance, and eligibility records, followed by deterministic re-derivation of `participant_provenance_policy_id` and `eligible_cohort_root`;
11. fresh re-verification of
   `VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1`;
12. control evidence recovering the exact selected reviewer
   `0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`;
13. an unexpired review-attestation message; and
14. EIP-712 signature recovery to that exact reviewer address.

Failure of any condition is HOLD.

## Output boundary

A valid review signature may establish:

```text
review_attestation_verified=true
related_identity_truth_verified=true
```

under #2365's bounded meaning: the complete reviewed evidence manifest is
authenticated by the selected reviewer. It is not a claim of metaphysical
one-human-one-key certainty.

This verifier still leaves:

```text
opening_concentration_and_sybil_limits_ready=false
opening_price_acceptance_allowed=false
opening_price_acceptance_hold=concentration_arithmetic_recheck_required
```

The existing concentration arithmetic must be rerun after evidence admission.

## Proof boundary

CI uses an ephemeral random test key only to prove generic EIP-712 recovery and
wrong-signer rejection. It also hides a malicious worktree edit to the pinned
manifest compiler with Git `assume-unchanged`, imports the review verifier in a
fresh child, and requires the manifest to validate without executing the dirty
compiler sentinel. The compiler Git blob is provenance input, not executable
worktree authority.

The proof also mutates the concentration-policy worktree module with an execution
sentinel and requires lineage verification to succeed from the privately
materialized reviewed Git blobs without executing the dirty bytes. It then
requires stale policy bodies, stale opening-window bodies, and changed
eligibility/cohort inputs to fail before review truth can be established.

The production fixed-address positive path cannot be signed in CI because the
production private key is intentionally absent.

The later operator ceremony must prepare the exact typed data, sign it offline
with the already-selected reviewer key, and verify it together with fresh
control evidence.

## Authority

No production private-key access, wallet/signer access, WC mutation,
runtime/service mutation, transaction construction/signing/broadcast,
Chain-2050 write, deployment, inventory funding, market/presale activation,
liquidity/treasury movement, or funds movement is performed or authorized.
