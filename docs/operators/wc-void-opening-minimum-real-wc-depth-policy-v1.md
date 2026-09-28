# WC/VOID opening minimum real-WC depth policy v1

Marker: `VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1`

Status: source-only opening-price acceptance policy. This contract does not
choose the production minimum, observe the wall clock, write the WC ledger,
activate WC/VOID or the presale, or move funds.

## Purpose

WC/VOID opens with zero protocol WC seed. A deterministic reserve-ratio formula
must not accept a price formed from trivially small or non-production quote
depth.

This contract requires a future launch artifact to commit an exact positive
whole-WC minimum **before the opening window begins**. Source code deliberately
does not choose that production value.

Policy-contract ID:

`sha256:1083951c05e23eea84280f2b8bf55422a14c00c3856d2792f2b12d32493e4a4a`

## What counts toward depth

Depth is derived from the existing canonical mechanisms rather than supplied as
an aggregate by the caller.

The verifier composes:

- `VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1`, requiring every
  price-forming commitment to be `production_earned_wc` and receipt-bound;
- `VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1`, requiring exact one-to-one
  opening settlement for every commitment; and
- the committed opening-window object.

Therefore:

```text
real WC depth
  = fully settled WC
  = production-earned price-forming commitment WC
```

Test, canary, operator-generated, development, synthetic-fixture, or unknown WC
cannot satisfy the depth calculation.

Participant eligibility is a separate coupled gate and is not relabeled as part
of this verifier.

## Launch-time minimum

A concrete policy binds:

- coupled launch ID;
- policy generation;
- policy commit timestamp;
- opening window ID;
- positive whole-WC minimum; and
- failure action.

The policy must be committed before `opens_at_ms`.

The source contract records:

```text
exact_launch_minimum_real_wc_depth_required=true
positive_whole_wc_minimum_required=true
production_minimum_real_wc_value_hardcoded=false
```

Different reviewed launch minima produce different content-addressed policy IDs;
the source mechanism does not silently select one.

## Price-acceptance rule

The opening price is eligible for acceptance only when both conditions are true:

1. the opening window is closed; and
2. settled production-earned WC is at least the committed minimum.

Otherwise:

```text
opening_price_acceptance_allowed=false
opening_price_acceptance_hold=hold_opening_price_acceptance
```

A failed minimum-depth check does not invent a fixed conversion, extend the
opening automatically, or authorize a different price.

## Deliberate runtime boundary

The verifier accepts explicit evidence objects only. It reports:

- `runtime_or_launch_evidence=false`;
- `live_depth_observation_verified=false`;
- `ledger_persistence_verified=false`;
- `wall_clock_read_performed=false`; and
- all activation/funds authority false.

A real launch still needs the chosen minimum committed in the launch policy and
runtime evidence that the final eligible cohort/settlements satisfy it.

## Authority

No WC ledger mutation, wallet/signer/private-key access, transaction
construction/signing/broadcast, Chain-2050 write, inventory funding, liquidity
movement, market/presale activation, or funds movement is authorized.

Verification:

```bash
node scripts/prove_void_wc_void_opening_minimum_real_wc_depth_policy_v1.mjs
```
