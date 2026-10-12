# Economic system-sponsored execution anti-grief policy v1

Marker: `VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1`

Status: source-only sponsorship admission policy. This contract does not reserve
gas, submit a transaction, access a wallet, mutate Chain 2050, activate a market,
or move funds.

## Purpose

Epoch-2 uses metered zero-gas-price execution:

- gas usage is still measured;
- participant native-gas balances are not required; and
- the native-gas economic charge is zero.

That execution model must not turn microscopic economic instructions into
unbounded shared execution obligations.

This policy bounds **sponsored gas capacity**, rather than introducing a hidden
minimum purchase/trade amount.

## Canonical execution evidence

The source proof binds the committed
`VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2` evidence and requires:

- Chain 2050;
- successful zero-gas-price execution;
- receipt effective gas price = 0;
- positive gas metering;
- participant native-gas balance not required;
- no production RPC contact; and
- no real funds movement.

The policy is also bounded by the existing signed-submission maximum gas limit
of `3,000,000`.

## No invented production budgets

The source contract does **not** choose production sponsorship budgets.

A future launch policy must content-address exact positive values for:

- per-intent sponsored gas limit;
- per-identity sponsored gas budget; and
- global sponsored gas budget.

It requires:

```text
per-intent <= per-identity <= global
per-intent <= signed-submission max gas limit
```

The contract records:

```text
exact_launch_budget_values_required=true
production_budget_values_hardcoded=false
```

## Composition with intent TTL/caps

Sponsored gas reservations are not a parallel reservation system.

The sponsorship policy binds one concrete TTL/caps policy ID. Every sponsorship
must map one-to-one to an economic intent by:

- intent ID;
- identity ID;
- reservation ID; and
- the same coupled launch ID.

Expired economic intents do not consume sponsored-gas budget.

The anti-grief classifier therefore composes directly with the existing
`VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1` state verifier.

## Signed-submission binding

For a new sponsored admission, the source classifier verifies the candidate
Epoch-2 signed-submission intent itself.

The sponsorship record is content-addressed over:

- sponsorship policy ID;
- coupled launch ID;
- TTL/caps policy ID;
- economic intent ID;
- identity ID;
- reservation ID;
- verified signed-submission digest; and
- signed gas limit.

The signed submission must:

- verify cryptographically;
- pass target, calldata-hash, nonce/replay-precheck, TTL, and max-gas rules;
- have gas limit exactly equal to the sponsored gas reservation; and
- have the same issue/expiry lifetime as the economic intent.

This prevents a caller from reserving a small gas amount while presenting a
larger signed transaction.

## Budget admission

For each explicit observation time the classifier:

1. verifies the current TTL/caps state;
2. validates one sponsorship record per tracked economic intent;
3. excludes expired intent sponsorships from reserved gas;
4. sums active sponsored gas by identity and globally;
5. verifies the new signed candidate;
6. computes prospective identity/global gas reservations; and
7. returns sponsorship allowed or denied.

Budget exhaustion returns:

```text
denial_reason=sponsored_gas_budget_exhausted
budget_exhaustion_action=deny_sponsorship_without_hidden_trade_minimum
hidden_minimum_trade_amount_applied=false
```

No minimum trade/purchase amount is inferred from gas cost.

## Deliberate runtime boundary

This source gate can establish the sponsorship policy mechanism while leaving
these false:

- runtime enforcement verified;
- reservation mutation;
- gas sponsorship performed;
- wall-clock read;
- RPC call;
- transaction submission/broadcast;
- authoritative Chain-2050 write;
- market/presale activation; and
- funds movement.

Concrete launch budget values and runtime reservation-store enforcement remain
later launch evidence.

## Lightweight coupled-gate binding

The exact policy-contract metadata is kept in the dependency-light module:

`tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs`

The coupled gate imports only that contract, not the ethers-dependent signed
intent verifier. This preserves lightweight fail-closed classification while the
focused proof validates the cryptographic dependency separately.

Policy contract ID:

`sha256:4a0a0641c414e6f716359ec4f030a8c8c9204d9752bc98bddc18b2ea1c211f86`

## Authority

No wallet/signer/private-key access, transaction construction/signing/submission/
broadcast, Chain-2050 write, inventory funding, liquidity movement, market or
presale activation, or funds movement is authorized.

Verification:

```bash
node scripts/prove_void_economic_system_sponsored_anti_grief_policy_v1.mjs
```
