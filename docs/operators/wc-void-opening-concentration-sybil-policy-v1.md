# WC/VOID opening concentration and Sybil policy v1

Marker: `VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1`

Status: source-only concentration arithmetic and policy contract. This lane does
not choose production share caps, does not verify real-world related-identity
truth, does not write the WC ledger, and does not activate WC/VOID or the
presale.

## Purpose

WC/VOID's zero-WC-seed opening price must not be dominated by one participant
or by multiple identities under common control.

The source mechanism therefore requires a future launch policy to commit exact
caps before opening and provides deterministic arithmetic over the already
verified eligible/settled cohort.

It deliberately does **not** pretend that caller-supplied cluster labels are
proof of real-world common control.

## Policy-contract boundary

Policy-contract marker:

`VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT_V1`

Canonical policy-contract ID:

`sha256:5711c6bb0097be076075ebce2d9f83daafa6d42e87bc581c6e347ec38d8d83a9`

The contract requires:

- exact launch cap values;
- positive per-participant and related-identity-cluster share caps;
- both caps strictly below 100% of the cohort;
- related-identity cap not lower than the participant cap;
- policy committed before the opening window;
- content-addressed policy identity;
- exact eligible-participant to cluster-record bijection;
- content-addressed cluster evidence IDs;
- an independent related-identity truth verifier before Sybil readiness;
- opening-price acceptance only after the window closes; and
- failure action `hold_opening_price_acceptance`.

The source does not hardcode production share percentages.

## Cap arithmetic

For each settled participant:

```text
participant_share_within_cap
  := participant_wc * 10,000
     <= total_settled_wc * max_participant_share_bps
```

For each related-identity cluster:

```text
cluster_share_within_cap
  := cluster_wc * 10,000
     <= total_settled_wc * max_related_identity_share_bps
```

Integer cross-multiplication avoids floating-point or rounding ambiguity.

The evaluator composes the existing canonical mechanisms:

- production-WC exclusion;
- participant provenance/eligibility;
- WC opening settlement bijection; and
- opening-window phase classification.

## Related-identity records

A structural cluster record binds:

- coupled launch ID;
- commitment ID;
- participant ID;
- cluster ID;
- content-addressed cluster evidence ID; and
- assignment method
  `content_addressed_related_identity_evidence_v1`.

The record must match one already-eligible participant exactly.

This only proves that the arithmetic is performed over a complete,
content-addressed cluster assignment. It does **not** prove the cluster
assignment reflects real-world common control.

## Fail-closed truth boundary

Even when both share-cap calculations pass, this V1 reports:

```text
related_identity_truth_verifier_required=true
related_identity_truth_verified=false
opening_concentration_and_sybil_limits_ready=false
opening_price_acceptance_allowed=false
opening_price_acceptance_hold=related_identity_truth_verifier_required
```

Therefore an attacker cannot make the Sybil gate green merely by assigning each
identity to a unique self-declared cluster.

A future independently reviewed related-identity evidence verifier must close
that boundary before the durable coupled gate may become ready.

## Deliberately unresolved

This lane does not prove:

- real-world related-identity/common-control truth;
- runtime enforcement;
- live cohort persistence;
- WC-ledger persistence;
- quote or VOID reserve custody;
- claim/refund execution;
- participant token control;
- canary execution; or
- coupled activation.

## Authority

All value-bearing authority remains false:

- WC ledger write;
- WC balance mutation;
- wallet/signer/private-key access;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- inventory funding;
- liquidity movement;
- market activation;
- public presale activation; and
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_concentration_sybil_policy_v1.mjs
```
