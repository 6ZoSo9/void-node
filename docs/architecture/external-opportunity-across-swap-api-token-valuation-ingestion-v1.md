# VOID Across Swap API Token Valuation Ingestion V1

## Purpose

This lane supplies an authenticated starting-asset USD valuation for the
self-capital round-trip paper observer. It converts one bounded Across token
catalog response into a sanitized, deterministic valuation record.

## Provider boundary

The implementation permits one read-only request shape:

```text
GET https://app.across.to/api/swap/tokens?chainId=<canonical-positive-integer>
Authorization: Bearer <API key>
```

The query boundary is exact. `chainId` must appear once and must be the only
query parameter. Duplicate `chainId` values, extra parameters, fragments,
redirects, alternate hosts, alternate paths, alternate methods, and malformed
chain identifiers fail closed. `/swap/tokens` does not use an `integratorId`
parameter in this contract.

The transport also enforces:

- HTTPS and exact host `app.across.to`;
- exact path `/api/swap/tokens`;
- `GET` only;
- a timeout from 1,000 through 30,000 milliseconds;
- a one-megabyte response limit;
- JSON content type;
- HTTP status 200;
- no redirect following.

## Selection and valuation

The response must be a non-empty token array. Every entry is parsed into a
bounded token record. The selector matches by exact chain ID and normalized EVM
address. A missing token or more than one matching token fails closed.

`priceUsd` is accepted only as a canonical non-negative decimal with at most 36
fractional digits. The selected base-unit amount must be a canonical positive
integer. Token decimals are taken from the selected provider record.

The valuation is computed with integer arithmetic:

```text
price USD micros = floor(priceUsd × 1,000,000)

position USD micros = floor(
  exact price numerator × base-unit amount × 1,000,000
  ÷ 10^(price fraction digits + token decimals)
)
```

No floating-point arithmetic is used. Both results conservatively round down to
six USD decimal places.

## Evidence record

The returned record binds:

- provider and exact endpoint;
- observation and evaluation times;
- selector chain, address, and amount;
- selected token chain, address, symbol, and decimals;
- floored price and position value;
- source price precision;
- a SHA-256 digest of the sanitized token, including its exact source price;
- a SHA-256 digest of the resulting valuation core.

The result retains no API key, raw response, token name, logo URL, wallet data,
or transaction payload.

## Verification boundary

The deterministic proof uses an injected mock transport and a synthetic API-key
string. It performs no live API request and accesses no real credential. The
proof verifies the exact `chainId`-only URL, bearer header construction,
conservative arithmetic, deterministic digests, missing and duplicate token
rejection, malformed-price rejection, unknown-field rejection, HTTP and content
boundaries, and query-pollution rejection.

## Authority boundary

This lane provides read-only valuation evidence only. It performs no wallet or
key access, balance query, approval, transaction construction, signing,
submission, bridge or swap execution, custody, deployment, service restart,
Work Credit write, Buy VOID mutation, or fund movement. It grants no live
execution authority.

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
