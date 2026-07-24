# VOID External Opportunity Observer V1

## Status

This is a **paper-only, read-only economic observation contract**.

It does not access a wallet or private key. It does not construct, sign,
submit, simulate, or broadcast a transaction. It has no mempool access,
custody, relayer execution, app-fee recipient, ledger authority, validator
authority, Buy VOID authority, Work Credit authority, or public mutation
endpoint.

A future live executor requires a separate legal, security, funding,
sanctions-screening, and one-shot authorization gate.

## Objective

Measure whether a documented external-network revenue model could produce
positive net economics for VOID after all modeled costs and explicit risk
haircuts.

The initial adapter is Across because its documented Swap API exposes
crosschain quote amounts, fee breakdowns, expected fill time, and quote
expiry. Across also documents optional integrator app fees.

The observer does **not** treat the total fee paid by an Across user as
VOID revenue. Gross revenue must be supplied as a separate, explicit,
documented assumption:

- `integrator_app_fee`;
- `relayer_margin`; or
- `other_documented`.

This prevents the observer from reporting protocol, LP, or relayer
compensation as if it automatically belonged to VOID.

## Current Across integration facts

Source review date: 2026-07-24.

- The current recommended quote surface is the Swap API
  `/swap/approval`.
- The older `/suggested-fees` surface is documented as legacy.
- Production API use requires a Bearer API key and an Integrator ID.
- Quotes expire and fees change with gas prices, liquidity utilization,
  and market conditions; fresh quotes should be used.
- The Swap API supports optional `appFee` and `appFeeRecipient` parameters
  for documented integrator revenue.

Official references:

- https://docs.across.to/introduction/swap-api
- https://docs.across.to/api-reference/swap/approval/get
- https://docs.across.to/introduction/api-keys
- https://docs.across.to/introduction/fees

No API credential is included in this lane. The initial implementation is
a pure deterministic transformer over versioned fixtures or a future
sanitized transport object.

## Input contract

`AcrossPaperQuoteInputV1` contains:

- quote observation and evaluation instants;
- quote identifier and expiry;
- origin and destination chain IDs;
- input and output token metadata;
- input, expected output, and minimum output amounts;
- expected fill time;
- total user fee and origin gas values;
- a separately named gross-revenue assumption and evidence label;
- destination gas, capital-at-risk, lock duration, annual capital cost,
  risk haircut, and safety buffer assumptions.

The parser is exact-keyed. Raw transaction fields such as `swapTx` are
rejected. A future transport must sanitize an upstream response before it
enters this contract.

## Deterministic economics

All USD values use integer microdollars. Floating-point arithmetic is not
used.

The observer calculates:

1. origin gas cost;
2. destination gas cost;
3. capital lock cost:
   `capital × annual cost bps × lock seconds / year`;
4. risk haircut applied to modeled gross revenue;
5. operator safety buffer;
6. total modeled cost;
7. paper net profit;
8. paper net-profit basis points relative to capital at risk.

The capital-lock and risk costs round upward so the paper result is not
optimistically biased.

A quote is classified as:

- `paper_positive`;
- `paper_negative`; or
- `expired`.

## Tamper evidence

The opportunity ID is the SHA-256 hash of canonical normalized input JSON.

The receipt contains a separate source-quote hash and a receipt hash.
Changing an amount, route, cost assumption, timestamp, revenue model, or
evidence label changes the opportunity ID and receipt hash.

## Legal and ethical boundary

Permitted phase-1 behavior:

- parse fixtures;
- accept future sanitized public quote data;
- calculate paper economics;
- produce deterministic receipts;
- compare routes without executing them.

Forbidden behavior:

- smart-contract vulnerability exploitation;
- unauthorized access;
- oracle manipulation;
- sandwich attacks;
- front-running users;
- wash trading or spoofing;
- sanctions evasion;
- custody or routing of third-party funds;
- use of a private key;
- transaction construction, signing, or submission.

The first possible live use must be VOID acting only for its own account
and capital, after a separate legal review. This document is an
engineering boundary, not a legal opinion.

## Repository boundary

This lane may modify only:

- `docs/architecture/external-opportunity-observer-v1.md`
- `src/external_opportunity/across_quote_observer_v1.ts`
- `scripts/prove_external_opportunity_observer_v1.ts`
- `.github/workflows/external-opportunity-observer-v1.yml`

Shared runtime, package, Buy VOID, WC, AI-agent, validator, P2P, wallet,
ledger, and release-authority paths remain outside this lane.
