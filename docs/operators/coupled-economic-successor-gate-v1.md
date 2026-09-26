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

## Remaining market gates

Even after the epoch-2 successor migration becomes source-ready, public economic
opening remains held until all of these are proven:

- fixed opening commitment window and deterministic close;
- participant provenance and eligibility;
- concentration and Sybil controls;
- minimum real-WC opening depth;
- exclusion of non-production/test/operator WC from price formation;
- durable claim/transfer-or-refund binding for opening allocations;
- durable canonical WC-ledger persistence;
- quote-reserve custody;
- reconciliation of the shared post-discovery model with the 5M/5M opening;
- reviewed VOID-to-WC reverse settlement before describing WC/VOID as fully
  two-sided;
- participant post-purchase `VoidToken` control;
- bounded anti-grief policy for system-sponsored execution;
- deterministic TTL plus participant/global caps for outstanding economic
  intents;
- complete public quote disclosure of economic fee, execution model, gross/net
  amounts, slippage/minimum output, and expiry;
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
