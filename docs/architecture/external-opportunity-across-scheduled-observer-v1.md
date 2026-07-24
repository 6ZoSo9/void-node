# VOID External Opportunity Across Scheduled Observer V1

## Status

Phase 2 provides the deterministic scheduling, cadence, daily-cap,
deduplication, and sanitized record core for recurring Across paper
observations.

This repository implementation does not install or activate a timer,
access an API credential, call Across, write a production state file, or
authorize transaction execution.

## Canonical dependencies

The scheduled observer depends on the sealed implementations:

- `src/external_opportunity/across_quote_observer_v1.ts`
- `src/external_opportunity/across_swap_api_quote_ingestion_v1.ts`
- canonical quote-ingestion merge:
  `ad935f509c9597a52896c3496f523e818ce55850`

The successful authenticated live canary is pinned by:

- text receipt SHA-256:
  `1e87b7754c12824193993ce1880ac9efc7838d850616900d30140aabc8a2c32c`
- JSON receipt SHA-256:
  `d03478399fc3373e20323510e3c8337b6b21d1d06e1c3aec0dd2ba1eb0baeeb3`
- opportunity ID:
  `93026fc7ad39618b75a99600458b17f9b09ad1e9fde0cb22a497cb71221e3bb1`
- modeled paper net profit:
  `0.891156` USD
- execution authorized:
  `false`

## Across request boundary

Across production uses:

- base URL: `https://app.across.to/api`
- quote endpoint: `GET /swap/approval`
- Bearer API key in the `Authorization` header
- two-byte `integratorId` query parameter

Across documents `/swap/approval` as a fresh quote endpoint and advises
integrators not to cache responses or poll more often than necessary.

This module contains no HTTP implementation. The sealed ingestion adapter
retains the exact-host, GET-only network boundary.

## Initial schedule policy

The V1 policy is fixed:

- minimum cadence: 900 seconds;
- authenticated GETs per run: 1;
- internal retries per run: 0;
- maximum authenticated GETs per UTC day: 96;
- quote caching: forbidden;
- live execution authorization: false.

The daily request counter resets at a UTC-day boundary. The 15-minute
cadence continues across midnight using the last attempt timestamp.

A request attempt consumes one daily slot even if a later response or
recording step fails. This prevents error paths from bypassing the daily
cap.

## Two-phase operation

The core exposes a two-phase deterministic contract.

### Plan

`planAcrossScheduledObservationV1` evaluates:

- canonical current UTC time;
- previous observer state;
- the 15-minute cadence;
- the 96-request daily cap.

A `ready` plan reserves exactly one authenticated GET by incrementing the
daily count and setting `last_attempt_started_at`.

Blocked plans perform no credential or network access and reserve no
request.

### Complete

`completeAcrossScheduledObservationV1` accepts:

- one ready plan;
- one sanitized result from the sealed Across ingestion adapter;
- a canonical completion time.

It verifies the ingestion and paper-receipt safety boundaries, suppresses
duplicates, and emits either:

- `recorded`, with one deterministic append-only JSONL record; or
- `duplicate`, with no append record.

## Duplicate suppression

V1 suppresses an observation if any of these values was already recorded
in the current UTC-day state:

- quote ID;
- opportunity ID;
- source quote SHA-256.

A duplicate still consumes the authenticated request slot already
reserved by its ready plan. It does not increment the append-record count.

The per-day dedupe arrays are bounded to 96 entries.

## Sanitized record

The append record contains only normalized paper economics and provenance:

- schedule and completion timestamps;
- daily authenticated-request ordinal;
- quote, opportunity, source-quote, source-receipt, and record hashes;
- paper opportunity status and expiry;
- route and token metadata;
- input and output amounts;
- expected fill time;
- total user fee;
- documented revenue model and evidence label;
- modeled costs and net profit;
- source response byte count;
- explicit false safety and execution flags.

It contains no:

- API key;
- `Authorization` header;
- integrator credential;
- raw API response;
- approval transaction;
- swap transaction;
- calldata;
- wallet object;
- private key;
- signature;
- transaction request.

The record hash is deterministic over a canonical JSON payload that
excludes its own hash field.

## State persistence contract

The module returns deterministic JSON text for state and JSONL text for
records. It performs no filesystem I/O.

A later deployment lane must provide:

- atomic state replacement;
- append-only record storage;
- mode-600 state and record files;
- single-instance locking;
- bounded retention and receipt rollups;
- crash recovery that preserves the reserved request count.

## Credential deployment contract

A later unattended deployment must use a user-scoped encrypted systemd
credential, preferably `LoadCredentialEncrypted=`. The API key must not be
placed in:

- the repository;
- a unit `Environment=`;
- an `EnvironmentFile=`;
- argv;
- a receipt;
- a log.

The integrator ID and EVM addresses are public configuration values.

## Funding boundary

Read-only quote observation requires no ETH or USDC.

The operator's proposed 50 USD budget remains unspent and unauthorized in
this phase. Any wallet funding, approval, swap, or fee-earning execution
requires a separate bounded execution gate.

## Explicitly forbidden

V1 contains no:

- HTTP client;
- credential reader;
- filesystem writer;
- child process;
- service installer;
- timer installer;
- wallet or private-key access;
- transaction construction;
- transaction signing;
- transaction submission;
- approval execution;
- swap execution;
- custody;
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
npx tsx scripts/prove_external_opportunity_across_scheduled_observer_v1.ts
npm run build
```

The proof uses the sealed ingestion adapter with an injected fixture
transport. It performs no live Across request and verifies:

- one request reservation per ready run;
- zero internal retries;
- 15-minute cadence;
- 96-request daily cap;
- UTC-day rollover;
- duplicate suppression;
- append-only single-line JSONL;
- deterministic state and record hashes;
- transaction-payload removal;
- absence of network, credential, filesystem, wallet, and execution
  surfaces;
- `live_execution_authorized=false`.

## Next gate

After this implementation is merged, a separate deployment preflight may
prepare:

- encrypted API-key credential provisioning;
- public route configuration;
- user service and timer units;
- state and record directories;
- one manual scheduled-run canary;
- timer enablement only after exact receipt review.

That future deployment remains paper-only and read-only.
