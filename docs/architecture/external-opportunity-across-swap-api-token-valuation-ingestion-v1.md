# VOID Across Swap API Token Valuation Ingestion V1

## Purpose

This lane creates the authenticated, read-only valuation boundary required by
the self-capital round-trip paper observer. It retrieves Across-supported token
metadata from `GET /api/swap/tokens`, selects exactly one token by chain ID and
address, and binds an exact token amount to a conservatively rounded USD value.

The lane does not compose a round trip and does not authorize trading. A later
adapter may combine two independently ingested quote legs with one valuation
receipt from this lane.

## Request boundary

The default transport permits only:

- HTTPS;
- host `app.across.to`;
- path `/api/swap/tokens`;
- method `GET`;
- explicit `chainId` and `integratorId` query parameters;
- bearer authentication supplied ephemerally;
- JSON responses no larger than 1 MiB;
- timeouts from 1 to 30 seconds;
- no redirects.

The transport is injected for tests. The deterministic proof uses a synthetic
API key and mock response and performs no live API request.

## Token selection

Every returned token is sanitized to:

- chain ID;
- lowercase EVM address;
- symbol;
- decimals;
- canonical non-negative `priceUsd` decimal.

The requested chain ID and address must match exactly one token. Missing and
duplicate matches fail closed. Unknown token-response keys fail closed so
execution-shaped or transaction-shaped fields cannot silently enter the
valuation record.

## Conservative valuation

The selected token price is floored to USD micro-units. The exact amount value
is derived with arbitrary-precision integer arithmetic:

```text
position value micros = floor(
  price numerator × amount base units × 1,000,000
  / (10^priceFractionDigits × 10^tokenDecimals)
)
```

The result binds:

- exact chain ID and token address;
- exact token base-unit amount;
- authenticated token decimals;
- observation and evaluation times;
- conservatively floored price and position value;
- a SHA-256 digest of the sanitized token record;
- a SHA-256 digest of the complete valuation core.

No floating-point arithmetic is used.

## Retention and authority boundary

The result retains no API key, authorization header, raw response body, token
logo URL, transaction payload, calldata, wallet data, or signer data.

This source performs no wallet or key access, balance query, approval,
transaction construction, signing, submission, swap, bridge execution, custody,
deployment, service restart, Work Credit write, Buy VOID mutation, or fund
movement. All execution and fund-movement authority flags are fixed false.

## Files

- `src/external_opportunity/across_swap_api_token_valuation_ingestion_v1.ts`
- `scripts/prove_external_opportunity_across_swap_api_token_valuation_ingestion_v1.ts`
- `fixtures/external-opportunity/across-swap-api-token-valuation-ingestion-v1.example.json`
- `schemas/external-opportunity-across-swap-api-token-valuation-ingestion-v1.schema.json`
- `docs/architecture/external-opportunity-across-swap-api-token-valuation-ingestion-v1.md`
- `.github/workflows/external-opportunity-across-swap-api-token-valuation-ingestion-v1.yml`

## Verification

```bash
node --import tsx scripts/prove_external_opportunity_across_swap_api_token_valuation_ingestion_v1.ts
npm run build
```

The proof covers exact request construction, deterministic token selection,
price and amount valuation, full-precision integer flooring, deterministic
hashing, synthetic credential non-retention, missing and duplicate matches,
malformed prices, zero amounts, unexpected input and response fields, non-JSON
responses, non-200 responses, and all false execution-authority flags.
