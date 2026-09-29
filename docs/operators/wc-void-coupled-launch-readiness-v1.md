# WC/VOID coupled launch readiness composition v1

Marker: `VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1`

Status: source-only composition of the canonical production WC/VOID readiness
classifier and the canonical coupled economic successor gate.

This source does not deploy, fund, sign, broadcast, activate, mutate Chain-2050,
write WC, move liquidity, or move funds.

## Problem

The historical WC/VOID production classifier contains a local
`coupled_activation_ready` field. Treating that field alone as coupled-launch
truth is weaker than the current canonical coupled successor gate, which now
contains the actual cross-lane requirements for:

- opening commitment-window policy;
- production-earned-WC provenance and eligibility;
- concentration/Sybil limits;
- minimum real-WC depth;
- exclusion of non-production WC;
- durable claim/transfer-or-refund binding;
- WC-ledger persistence and quote-reserve custody;
- reconciled post-discovery market state;
- reverse VOID→WC settlement;
- participant post-purchase VoidToken control;
- sponsored-execution anti-grief policy;
- economic-intent TTL and outstanding caps;
- public quote disclosure;
- bounded canary; and
- coupled activation readiness.

## Composition rule

`classifyVoidWcVoidCoupledLaunchReadinessV1` accepts three explicit source
objects:

1. the WC/VOID production candidate;
2. the coupled economic successor-gate candidate; and
3. the economic EVM successor-migration candidate required by the coupled gate.

It invokes the canonical classifiers directly.

The composite remains `HOLD` unless:

- `classifyVoidWcVoidProductionReadinessV1(...)` returns
  `SOURCE_READY`; and
- `classifyVoidCoupledEconomicSuccessorGateV1(...)` independently returns
  `SOURCE_READY`, including its successor-migration dependency.

A production candidate cannot bypass this composition by merely declaring
`coupled_activation_ready=true`.

## SOURCE_READY meaning

When both underlying classifiers are source-ready, the composition emits a
content-addressed `composition_id` binding selected production and coupled
policy identities.

Even then, all activation/funding/value-bearing authority remains false:

```text
activation_authority=false
funding_authority=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

`SOURCE_READY` is not launch authorization.

## Current canonical state

The current checked-in production and coupled candidates remain `HOLD`. This
composition does not rewrite those candidates or close any live gate.

Verification:

```bash
node scripts/prove_void_wc_void_coupled_launch_readiness_v1.mjs
```
