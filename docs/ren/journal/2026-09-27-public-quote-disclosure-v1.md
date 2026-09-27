# 2026-09-27 — WC/VOID Public Quote Disclosure V1

Marker: `VOID_REN_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1`

## Canonical base

This lane starts from canonical main:

`3656d62f9ad62c8c4b803066032bbe234a78be18`

That base includes merged #1917 claim-binding source, #1921 shared-market V2
reconciliation, and #1922 opening-window policy.

## Selected blocker

The next bounded source gate is:

`public_quote_disclosure_ready`

Existing launch truth required complete economic quote disclosure but did not
have a canonical WC/VOID quote envelope that made every charge and execution
assumption explicit.

## Source contract

`VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1` requires each WC/VOID quote to bind:

- coupled launch ID;
- exact market-state ID;
- Chain 2050 / mainnet0 / execution epoch 2;
- canonical VoidToken;
- WC→VOID or VOID→WC direction and exact asset/unit profile;
- gross input, trade input, and input-side fee total;
- gross output, output-side fee total, and net output;
- every individual fee component with unique code, side, asset, and amount;
- slippage tolerance and deterministic minimum output;
- issue and expiry timestamps; and
- the reviewed epoch-2 metered zero-gas-price execution model.

The proof binds that execution disclosure to the canonical coupled economic
candidate and the merged Besu free-gas evidence showing:

- transaction gas price = 0;
- effective receipt gas price = 0;
- positive gas metering;
- no participant native-gas balance requirement; and
- no production RPC or real-funds authority in that evidence.

The quote rejects presale-price authority and fixed WC↔VOID conversion.

## Gate effect

This source lane sets only:

`public_quote_disclosure_ready=true`

The coupled candidate remains `HOLD`.

The quote verifier explicitly keeps:

- `pricing_math_verified=false`;
- `reserve_custody_verified=false`;
- `runtime_publication_verified=false`;
- `quote_execution_authority=false`;
- `market_activation_authority=false`; and
- `funds_movement_authority=false`.

## Authority boundary

No wallet/signer/private-key access, WC mutation, transaction
construction/signing/broadcast, Chain-2050 write, inventory funding, liquidity
movement, runtime/service mutation, market activation, presale activation, or
funds movement occurred.

Highest truth state at journal creation: source branch; hosted CI pending.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
