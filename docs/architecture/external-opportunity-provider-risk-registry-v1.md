# VOID External Opportunity Provider Risk Registry V1

Marker: `VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1`

## Purpose

This lane establishes the deterministic policy boundary between external
opportunity discovery and any future execution path. It allows VOID to record
paper opportunities from explicitly registered providers while refusing to
interpret a profitable quote as permission to access a wallet, construct a
transaction, submit a transaction, mutate a service, or move money.

The first registry fixture covers the existing Across paper-observer lane for
Ethereum and Base native USDC. It is intentionally bounded to a maximum
five-dollar paper notional per observation and twenty-five dollars of paper
notional per UTC day. These values are policy-development limits, not permission
to spend those amounts.

## Current external facts pinned by the example

The example uses:

- Across production API origin: `https://app.across.to/api`
- Ethereum mainnet chain ID: `1`
- Base mainnet chain ID: `8453`
- Ethereum USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Primary documentation:

- Across API reference: <https://docs.across.to/api-reference>
- Across Swap API introduction: <https://docs.across.to/introduction/swap-api>
- Across fee documentation: <https://docs.across.to/introduction/fees>
- Circle USDC contract addresses:
  <https://developers.circle.com/stablecoins/usdc-contract-addresses>

Across documents that production requests use bearer authentication and an
integrator ID. Across also warns integrations not to cache fee quotes because
fees and routes change. This registry therefore pins the API origin but stores
no credential and rejects a paper quote older than the configured maximum age.

## Six-file lane

1. `src/external_opportunity/provider_risk_registry_v1.ts`
   - pure deterministic validation and evaluation
   - no network client
   - no credential reader
   - no wallet or signer
   - no transaction builder
   - no transaction submission

2. `schemas/external-opportunity-provider-risk-registry-v1.schema.json`
   - machine-readable registry contract
   - fixed `paper_only` phase
   - fixed `live_execution_enabled=false`
   - all authority fields fixed false

3. `fixtures/external-opportunity/provider-risk-registry-v1.example.json`
   - bounded Across example
   - exact API, chain, and token allowlists
   - empty execution-contract allowlist

4. `scripts/prove_external_opportunity_provider_risk_registry_v1.ts`
   - validates the fixture
   - proves positive and negative paper classifications
   - proves exact-threshold and one-quantum-below derived-metric behavior
   - proves stale, unknown-provider, wrong-origin, and wrong-token holds
   - proves live candidates remain blocked

5. `.github/workflows/external-opportunity-provider-risk-registry-v1.yml`
   - focused proof and full TypeScript build

6. This architecture record.

## Decision model

The evaluator returns one of four statuses:

- `recordable_paper_positive`
- `recordable_paper_negative`
- `held`
- `live_candidate_blocked`

A trusted, fresh paper quote can be recorded even when it fails profitability
thresholds. Untrusted origins, providers, chains, or tokens are held and are not
record-authorized. Stale quotes are also held rather than recorded as current
opportunities.

Every decision fixes these fields to false:

- `live_execution_authorized`
- `wallet_or_key_access_authorized`
- `transaction_construction_authorized`
- `transaction_submission_authorized`

## Economic and safety gates

Each provider policy defines:

- maximum quote age
- maximum single and daily paper notional
- maximum protocol-fee basis points
- maximum gas cost
- maximum slippage
- minimum net profit
- minimum net-profit margin
- maximum single and daily loss
- mandatory simulation for any future live candidate
- mandatory operator approval for any future live candidate
- mandatory exact execution-contract allowlisting for any future live candidate

Derived economic metrics are normalized to the same 12-decimal representation
used in the decision evidence before those derived metrics are compared with
policy thresholds. This prevents binary floating-point residue from making the
classification contradict the metric that the decision actually publishes. An
exact published threshold value is treated as exact-threshold evidence; a value
one 12-decimal quantum below the threshold remains below it. Direct observation
fields such as quote age, notional, gas cost, and slippage retain their direct
policy comparisons.

Even a candidate satisfying every numerical gate remains blocked in V1 because
the registry schema and implementation require `live_execution_enabled=false`.

## Explicit non-authority

This lane does not:

- start, stop, enable, or modify the scheduled observer service or timer
- access or retain an Across API credential
- perform an authenticated request
- read a wallet or private key
- fund a wallet
- construct, sign, or submit a transaction
- authorize a bridge deposit
- mutate Buy VOID state
- award Work Credits
- change validator state
- commit, push, merge, or deploy itself
