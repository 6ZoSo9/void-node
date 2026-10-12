# 2026-09-27 — Shared Market Reconciliation V2

Marker: `VOID_REN_SHARED_MARKET_RECONCILIATION_V2`

## Context

Canonical main before this lane:

`e5940d94720ee91b1ec664718c3e2413b504aa7a`

PR #1917 merged the WC/VOID opening claim-binding source mechanism while
correctly leaving the durable claim-binding production gate false.

The next selected source blocker was the stale shared post-discovery model.

## Problem found

Historical V1 still modeled all three approved markets as sharing one
presale-closeout opening phase and used six-decimal VOID atoms for each
10,000,000-VOID allocation.

That no longer matches current production policy:

- WC/VOID is part of the coupled presale opening;
- WC/VOID uses 5M participant VOID + 5M retained reserve;
- BTC/VOID and ETH/VOID remain post-presale;
- canonical VoidToken is 18 decimals;
- canonical execution binding is Chain 2050 / mainnet0 / epoch 2 /
  0x470075b85352eb86f7d089fb9ba88945f12aad94.

## PR #1921

PR #1921 adds `VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2` while preserving
V1 as historical/regression evidence.

The V2 source model:

- derives WC opening state from the canonical coupled-opening source;
- accounts 30M total planned VOID inventory exactly;
- accounts WC as 5M participant allocation + 5M retained reserve;
- leaves BTC/VOID and ETH/VOID explicitly post-presale and unopened;
- marks V1 shared-closeout and six-decimal VOID assumptions non-authoritative;
- sets only `shared_post_discovery_model_reconciled=true`;
- keeps the overall coupled economic candidate `HOLD`;
- keeps quote custody, VOID custody, funding, canary, and activation false.

## Authority boundary

No wallet/signer/private-key access, WC mutation, transaction
construction/signing/broadcast, Chain-2050 write, inventory funding, liquidity
movement, runtime/service mutation, market activation, presale activation, or
funds movement occurred.

Highest truth state at this journal write: draft PR #1921, hosted validation
pending.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
