# VOID External Opportunity Across Quote Ingestion V1

## Status

Phase 1 is a bounded, read-only quote-ingestion adapter for the Across
Swap API.

The adapter retrieves a fresh `GET /swap/approval` response, discards all
execution-shaped fields, normalizes the documented economic fields, and
passes the resulting paper quote into the sealed External Opportunity
Observer V1.

This phase does not authorize live execution.

## Canonical dependency

The adapter depends on:

- `src/external_opportunity/across_quote_observer_v1.ts`
- sealed observer merge:
  `4af286ab1dccac5e938a7115a94101920f607355`
- sealed observer module SHA-256:
  `7d8f6909de099c7bece2b1f96cecf5cbffa11c294c0657c367499821a3d53ca3`

The observer remains the authority for deterministic paper economics,
opportunity IDs, source-quote hashes, receipt hashes, expiry status, and
the final `live_execution_authorized=false` boundary.

## Across API contract

Implementation references:

- `https://docs.across.to/introduction/swap-api`
- `https://docs.across.to/api-reference/swap/approval/get`
- `https://docs.across.to/introduction/api-keys`
- `https://docs.across.to/introduction/fees`

The production request boundary is:

- origin: `https://app.across.to`
- path: `/api/swap/approval`
- method: `GET`
- authentication: `Authorization: Bearer <api-key>`
- production attribution: two-byte `integratorId`
- cache policy: `Cache-Control: no-store`
- redirects: rejected
- response limit: 1 MiB
- timeout: 1–30 seconds

The legacy `/suggested-fees` endpoint is not used.

## Supported V1 request scope

V1 is EVM-only and supports these Across trade types:

- `exactInput`
- `minOutput`
- `exactOutput`

Required query fields:

- amount
- input token
- output token
- origin chain ID
- destination chain ID
- depositor
- two-byte integrator ID

Optional fields:

- recipient
- app fee
- app fee recipient

A nonzero app fee requires an app fee recipient.

The adapter does not accept embedded actions, gasless submission, source
selection, refund configuration, slippage overrides, or arbitrary query
parameters in V1.

## Credential boundary

The API key is supplied by the caller in memory.

The adapter:

- does not read environment variables;
- does not read credential files;
- does not write credential files;
- does not log credentials;
- does not place credentials in the URL;
- does not place credentials in output objects;
- does not hash credentials;
- does not retain the raw response.

The injected transport used by tests receives a fixture key only.
Production credential provisioning is outside this repository-only phase.

## Response normalization

The adapter copies only these documented response fields:

- quote ID;
- quote expiry timestamp;
- expected fill time;
- input and output token identity;
- input amount;
- expected output amount;
- minimum output amount;
- total fee amount and USD value;
- origin gas USD value;
- destination gas USD value;
- app fee amount and USD value.

The adapter does not copy:

- `approvalTxns`;
- `swapTx`;
- allowance or balance checks;
- calldata;
- transaction targets;
- gas limits;
- fee-per-gas values;
- signatures;
- deposit IDs;
- any other execution-shaped field.

Unknown response fields are ignored rather than retained.

## Revenue honesty

Across protocol fees are not VOID revenue.

For V1, gross revenue is derived only from the documented app-fee entry:

`fees.total.details.app.amountUsd`

The evidence label is:

`across_swap_api_fee_breakdown_app_amount_usd`

If no app fee is configured, a nonzero app-fee amount in the response is
rejected.

The adapter does not treat LP fees, relayer fees, swap impact, bridge
fees, or user-paid total fees as VOID revenue.

## Conservative rounding

The sealed observer accepts USD decimals with six fractional places.

Across may return more precision. The adapter converts values as follows:

- app-fee revenue: floor to USD micros;
- total user fee: ceil to USD micros;
- origin gas: ceil to USD micros;
- destination gas: ceil to USD micros;
- safety buffer: ceil to USD micros;
- capital at risk: floor to USD micros.

This avoids overstating revenue or understating costs.

## Observation policy

The caller supplies bounded paper assumptions for:

- capital at risk in USD;
- capital lock duration;
- annual capital-cost basis points;
- risk-haircut basis points;
- safety buffer in USD.

Capital lock duration must be at least the API’s expected fill time.

The adapter derives app-fee revenue and gas costs from the quote and then
calls `observeAcrossPaperQuoteV1`.

## Explicitly forbidden

V1 contains no:

- HTTP POST;
- redirect following;
- caching;
- wallet access;
- private-key access;
- transaction construction;
- transaction signing;
- transaction submission;
- approval execution;
- swap execution;
- custody;
- service installation;
- service restart;
- runtime activation;
- Buy VOID mutation;
- Work Credit mutation;
- ledger mutation;
- validator mutation;
- AI-agent lane mutation;
- P2P lane mutation;
- release-authority mutation.

## Proof

Run:

```bash
npx tsx scripts/prove_external_opportunity_across_quote_ingestion_v1.ts
npm run build
```

The proof uses an injected fixture transport and performs no Across API
request.

It verifies:

- exact-host HTTPS GET construction;
- Bearer-header placement;
- no-cache headers;
- two-byte integrator ID;
- app-fee revenue extraction;
- conservative USD rounding;
- deterministic observer output;
- expired-quote handling;
- redirect rejection;
- exact-host rejection;
- credential non-retention;
- transaction-payload discard;
- no network call in the proof;
- no execution authorization.

## Future gate

A later live observation deployment requires a separate review for:

- API credential provisioning;
- route-selection policy;
- request cadence and rate limits;
- secret handling;
- runtime isolation;
- operational monitoring;
- legal and sanctions review.

A live transaction executor remains a separate project and is not
authorized by this adapter.
