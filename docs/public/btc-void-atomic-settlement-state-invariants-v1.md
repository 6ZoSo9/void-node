# BTC/VOID atomic settlement state invariants v1

Marker: `VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1`

This contract ports the still-useful atomic-settlement state machine from
historical PR #1252 onto the current BTC/VOID market stack. It does not revive
the stale branch or duplicate the quote, reserve, journal, or shared-market
implementations already on `main`.

## Current-stack bindings

Every settlement contract must bind to a freshly rederived
`void.btc_void.indicative_quote.v1` from
`tools/void-btc-void-quote-math-v1.mjs`. The contract carries the full quote
request and exact `indicative_quote_id`; BTC and VOID settlement amounts must
match the current quote result exactly.

The contract also binds a content-addressed snapshot of the current shared
`BTC_VOID` market policy: native BTC, satoshi units, VOID base asset, current
settlement-source profile, current opening-settlement adapter configuration,
and the current VOID market allocation. This source contract does not introduce
a fixed WC→VOID redemption claim; WC/VOID pricing remains market-determined.

For a terminal `btc_to_void` settlement, the trace must additionally carry a
terminal binding whose reserve-recycling request is rederived through the
current `VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1`, then evaluated against
the current buyback-lot journal transition contract. The final settlement
evidence ID must equal the canonical current `source_sale_id`. A conflicting
journal decision fails closed; exact already-accepted plans remain idempotent.

`void_to_btc` settlement uses the same quote and atomic state machine but does
not create the BTC-sale buyback-lot follow-on.

## State-machine invariants

The source evaluator preserves:

- exact content-addressed contract, event, terminal-binding, and evaluation IDs;
- canonical decimal native-unit inputs;
- Bitcoin MAX_MONEY enforcement for BTC settlement amount;
- asymmetric refund horizons with an explicit safety margin;
- role-bound source/counterparty refund evidence;
- distinct evidence ownership for distinct transitions;
- exact event replay idempotence;
- terminal-state non-reopening;
- two-sided refund completion after counterparty refund; and
- no automatic retry.

## Input acquisition

The CLI uses the shared bounded BTC/VOID stdin reader:

- settlement/journal-sized input ceiling: 1 MiB;
- 500 ms idle deadline;
- 2 second total deadline;
- fail-closed pause/destroy on timeout or overflow.

## Authority boundary

This is source/proof only. It does not execute Bitcoin regtest or Bitcoin
mainnet, execute Chain-2050 settlement, reserve executable inventory, seed or
move liquidity, access a wallet or signer, construct or broadcast a
transaction, sweep treasury proceeds, mutate WC, activate a market, or move
funds.

Bitcoin-regtest plus isolated Chain-2050 execution remains a separate
post-merge acceptance gate before any inventory or liquidity authority.

## Proof

```bash
node scripts/prove_void_btc_void_atomic_settlement_state_invariants_v1.mjs
```

Expected marker:

```text
VOID_BTC_VOID_ATOMIC_SETTLEMENT_CURRENT_STACK_V1_PROOF_GREEN
```
