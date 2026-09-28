# WC/VOID opening non-production WC exclusion v1

Marker: `VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1`

Status: source-only policy and verifier. This contract does not activate WC/VOID,
open the presale, write the WC ledger, fund inventory, access a signer, or move
funds.

## Purpose

The WC/VOID opening price is formed from settled participant WC over the fixed
5,000,000-VOID opening tranche. Test, canary, internal/operator-generated,
synthetic-fixture, development, or otherwise unknown WC must not enter that
price-forming cohort.

This gate closes only that classification/exclusion boundary. Participant
eligibility, related-identity/Sybil policy, concentration limits, and minimum
real-WC depth remain separate launch gates.

## Policy identity

Canonical policy ID:

`sha256:9cc4c2486e5571e6a80c4fa4d2caf8f0ac1d0d8736d27599814f859412a85d6d`

The only price-forming source class is:

`production_earned_wc`

The following classes are explicitly excluded:

- `canary_wc`
- `development_wc`
- `operator_generated_wc`
- `synthetic_fixture_wc`
- `test_wc`
- `unknown_wc`

A production price-forming provenance record must bind one existing opening
commitment exactly by launch ID, commitment ID, participant ID, WC account, and
whole-WC amount. It must also bind a content-addressed production earning receipt
ID.

The verifier requires an exact one-to-one mapping between the opening commitment
set and its provenance records. Missing, duplicate, substituted, accessor-shaped,
unknown-class, or non-production records fail closed.

## Deliberately not decided

This contract explicitly leaves these false:

- participant eligibility decision;
- concentration policy decision;
- minimum depth policy decision;
- runtime/launch evidence;
- WC ledger mutation;
- market activation;
- public presale activation; and
- funds movement.

A participant can therefore have correctly classified production-earned WC while
still failing a later eligibility, Sybil/concentration, minimum-depth, custody,
settlement, or canary gate.

## Coupled-gate meaning

The coupled candidate may set
`opening_nonproduction_wc_exclusion_ready=true` only while it carries the exact
policy binding above. The coupled classifier rechecks that complete policy object
before considering the gate satisfied.

This means **policy-ready**, not that a live launch cohort has already been
verified.

## Authority

The module is explicit-input/source-only and grants no:

- WC issuance or ledger write;
- WC balance mutation;
- wallet/signer/private-key access;
- transaction signing or broadcast;
- Chain-2050 write;
- inventory funding;
- liquidity movement;
- market or presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_nonproduction_exclusion_v1.mjs
```
