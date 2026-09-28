# Coupled economic successor gate v1

Marker: `VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1`

Status: source-only, fail-closed. The checked-in candidate is `HOLD`.

## Purpose

This gate replaces the parts of the older coupled presale/WC hardening line that
assumed the private Anvil EVM itself would become the production economic
execution layer.

PR #1851 changed that architecture:

- epoch 1 Anvil becomes an immutable Economic Genesis Archive;
- live economic value and obligations migrate to a clean epoch-2 successor;
- the canonical `VoidToken` remains the only economic VOID asset;
- native gas is execution metering, not a second economic asset;
- participants do not need a native-gas balance;
- raw public JSON-RPC stays closed; and
- public operation uses read verification plus bounded signed submission.

The old #1829-#1844 deployment/signature stack is therefore not a prerequisite
for epoch-2 launch.

## Upstream binding

The gate does not trust a local
`successor_migration_source_ready=true` flag.

It invokes
`classifyVoidEconomicEvmSuccessorMigrationV1` on the canonical successor
migration candidate and requires a real upstream `SOURCE_READY` decision.

The checked-in successor candidate is currently `HOLD`, so this coupled gate
must also remain `HOLD`.

## WC/VOID opening invariants

The gate binds the same opening policy as the canonical coupled-opening source:

- total protocol allocation: 10,000,000 VOID;
- opening participant tranche: 5,000,000 VOID;
- retained post-opening reserve: 5,000,000 VOID;
- protocol WC seed: 0;
- fixed conversion: false;
- fixed opening price: false;
- clearing price source: settled WC over the 5M opening tranche; and
- allocation policy: deterministic pro-rata largest remainder.

This is market-discovered pricing, not a fixed WC-to-VOID redemption promise.

## Opening claim binding source gate

The source-level claim binding is now represented by
`VOID_WC_VOID_OPENING_CLAIM_BINDING_V1`.

It binds every settled opening commitment to one cohort-atomic outcome:

- `finalize`: every participant has one exact content-addressed VoidToken
  transfer claim for the deterministic pro-rata allocation; or
- `abort`: every participant has one exact content-addressed full-WC refund
  claim.

Mixed transfer/refund cohorts, partial refunds, amount drift, participant/account
substitution, settlement substitution, and opening-state substitution fail
closed. This closes the missing source mechanism, but **does not** close the durable
candidate gate. `opening_claim_transfer_or_refund_binding_ready` remains false
until the binding is durably persisted and independently verified. Ledger refund
writes, token transfers, participant control, canary execution, funding, and
activation also remain separate unproven gates.

## Shared post-discovery model reconciliation

`VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2` now replaces the stale V1
production assumptions without rewriting historical V1 evidence.

The reconciled source model binds canonical Chain 2050 / `mainnet0` / epoch 2
`VoidToken` at 18 decimals, treats WC/VOID as the coupled presale opening with
5M participant VOID + 5M retained reserve, and leaves BTC/VOID plus ETH/VOID as
separate post-presale unopened markets with 10M planned inventory each.

The checked-in source gate records
`shared_post_discovery_model_reconciled=true` only together with a closed
`shared_post_discovery_reconciliation` binding. The classifier independently
re-derives the canonical V2 source-model fixture through
`VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2` and requires the candidate's
exact content-addressed reconciliation and WC-opening identities plus canonical
result fields to match.

Current source-model identities are:

- reconciliation ID
  `sha256:3c543d4b6e0d30e5c65e3a6a9588a71fc0929692cf3278e43933e14f134853c5`;
- WC opening state ID
  `sha256:93ec2dd83d6b1d57c93c0456056ad0c5fa85f2d7d1188ad1b26aad604d24c88d`.

The fixture is explicitly marked `source_model_fixture=true` and
`runtime_or_launch_evidence=false`. These identities prove the reviewed
source-model reconciliation only. They are not a live cohort, ledger, custody,
funding, canary, settlement, or activation receipt. Quote/VOID custody,
post-presale market opening, funding, canary, and activation remain unproven.

## Opening commitment window policy

`VOID_WC_VOID_OPENING_WINDOW_POLICY_V1` now defines the deterministic opening
window contract without inventing a fixed duration. The exact launch artifact
must commit an absolute open/close window before opening, every canonical
commitment must have exactly one in-window admission, and the close boundary is
exclusive.

The source gate therefore records
`opening_commitment_window_policy_ready=true`. This does not prove participant
eligibility, provenance, live persistence, or runtime clock enforcement.

## Participant provenance and eligibility policy

`VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1` reuses the
existing paid-work credential ↔ WC-account binding and paid-work earning adapter
receipt rather than introducing a second participant identity system.

The coupled candidate records
`opening_participant_provenance_and_eligibility_ready=true` only while carrying
the exact policy binding:

`sha256:66655e80ef7bcbc2edce68b7ab285d0bb404e95fb546e7bd27451c189613eacf`.

The policy binds each future price-forming opening commitment to:

- a participant ID derived from the existing agent/credential/binding/WC-account
  tuple;
- an active, unrevoked credential↔WC-account binding valid at admission;
- production-earned WC already admitted through the non-production exclusion
  policy; and
- the same content-addressed paid-work earning receipt, with matching agent,
  credential, binding, account, and canonically redeemable WC.

This is **source-policy readiness only**. It does not claim that the final live
cohort has already been admitted. Related-identity/Sybil rules, concentration
limits, and minimum real-WC depth remain explicitly separate and false.

## Non-production WC exclusion policy

`VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1` defines the source-only
price-formation provenance filter.

The coupled candidate records
`opening_nonproduction_wc_exclusion_ready=true` only while carrying the exact
policy binding:

`sha256:9cc4c2486e5571e6a80c4fa4d2caf8f0ac1d0d8736d27599814f859412a85d6d`.

Only `production_earned_wc` may enter a future price-forming commitment set.
Test, canary, operator-generated, synthetic-fixture, development, and unknown WC
classes fail closed. Every accepted commitment must have a one-to-one provenance
record bound to the same launch, commitment, participant, WC account, amount,
and a content-addressed production earning receipt.

This is **policy readiness only**. It does not claim that a live opening cohort
has been collected or verified, and it deliberately does not decide participant
eligibility, related-identity/Sybil policy, concentration limits, or minimum
real-WC depth.

## Public quote disclosure

`VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1` now defines the closed public
WC/VOID quote disclosure envelope. It requires exact gross/trade/net accounting,
a complete fee-component list, slippage and minimum output, expiry, market-state
binding, and the reviewed epoch-2 metered zero-gas-price execution model.

The source gate therefore records `public_quote_disclosure_ready=true`.
This proves disclosure shape and arithmetic only. It does not prove reserve
custody, market pricing math, live publication, quote execution, or activation.

## Remaining market gates

Even after the epoch-2 successor migration becomes source-ready, public economic
opening remains held until all of these are proven:

- live application of the participant provenance/eligibility policy to the
  final opening cohort, while the source policy itself is ready;
- concentration and Sybil controls;
- minimum real-WC opening depth;
- live application of the production-WC provenance policy to the final opening
  cohort, while the source exclusion policy itself is ready;
- durable claim/transfer-or-refund binding for opening allocations;
- durable canonical WC-ledger persistence;
- quote-reserve custody;
- reviewed VOID-to-WC reverse settlement before describing WC/VOID as fully
  two-sided;
- participant post-purchase `VoidToken` control;
- bounded anti-grief policy for system-sponsored execution;
- deterministic TTL plus participant/global caps for outstanding economic
  intents;
- bounded production canary; and
- coupled presale + WC/VOID activation readiness.

No threshold value is invented by this gate. Numeric concentration, minimum
depth, and sponsorship budgets remain explicit later policy choices.

## Authority

A `SOURCE_READY` result would still authorize none of the following:

- state export or genesis build;
- runtime mutation;
- wallet, signer, or private-key access;
- transaction construction, signing, or broadcast;
- Chain-2050 writes;
- inventory funding or liquidity movement;
- market or presale activation;
- migration activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_coupled_economic_successor_gate_v1.mjs
```
