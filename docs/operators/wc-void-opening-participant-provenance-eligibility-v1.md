# WC/VOID opening participant provenance and eligibility v1

Marker: `VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1`

Status: source-only policy and verifier. This contract does not admit a live
opening cohort, mutate Work Credits, activate WC/VOID or the presale, access a
signer, or move funds.

## Purpose

The WC/VOID opening commitment already binds a content-addressed participant ID,
a WC account, and a whole-WC amount. This policy defines how a future
price-forming participant must prove that those fields correspond to an existing
VOID paid-work identity and production-earned WC.

It reuses existing VOID identity surfaces instead of creating a parallel
identity system:

- active paid-work credential ↔ WC-account binding; and
- content-addressed paid-work WC earning adapter receipt.

## Policy identity

Canonical policy ID:

`sha256:66655e80ef7bcbc2edce68b7ab285d0bb404e95fb546e7bd27451c189613eacf`

Identity source:

`active_paid_work_credential_wc_account_binding_v1`

Earning source:

`agent_paid_work_wc_earning_adapter_receipt_v1`

The opening participant ID is a deterministic SHA-256 content ID over the
existing identity tuple:

- agent ID;
- credential ID;
- binding ID; and
- destination WC account.

The policy does not create a new root identity, credential, or WC account.

## Eligibility requirements

A future price-forming commitment is source-policy eligible only when:

1. the #1950 non-production exclusion verifier already classifies its WC as
   `production_earned_wc`;
2. the commitment's participant ID equals the content ID derived from its
   existing agent/credential/binding/account tuple;
3. the credential↔WC-account binding is active, not revoked, and valid at the
   admission timestamp;
4. the same earning receipt content SHA is bound by the production-WC provenance
   record;
5. the paid-work adapter receipt ID, credential, agent, binding, and WC account
   all match the commitment identity; and
6. the earning receipt marks the WC as canonically redeemable.

The verifier requires an exact one-to-one mapping between price-forming
commitments and eligibility records. Missing, duplicate, substituted,
expired/revoked, accessor-shaped, receipt-mismatched, or explicitly ineligible
records fail closed.

## Deliberately separate gates

This policy does not decide or prove:

- related-identity or Sybil policy;
- per-participant or related-identity concentration limits;
- minimum aggregate real-WC opening depth;
- live final-cohort admission;
- durable WC-ledger persistence;
- reserve custody;
- canary execution; or
- coupled market/presale activation.

Those remain distinct HOLD gates.

## Coupled-gate meaning

The coupled candidate may set
`opening_participant_provenance_and_eligibility_ready=true` only while carrying
this exact policy binding.

This means the provenance/eligibility **source policy is ready**. It is not a
claim that the final live launch cohort has already been verified.

## Authority

All mutation/value authority remains false. The module grants no:

- WC ledger write or balance mutation;
- wallet/signer/private-key access;
- transaction signing or broadcast;
- Chain-2050 write;
- inventory funding;
- liquidity movement;
- market or presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_participant_provenance_eligibility_v1.mjs
```
