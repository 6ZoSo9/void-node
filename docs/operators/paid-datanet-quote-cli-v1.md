# Paid DataNet Quote CLI V1

Marker: `VOID_PAID_DATANET_QUOTE_CLI_V1`

## Purpose

This command-line tool turns the merged Paid DataNet Service Catalog V1 into a practical, one-command quoting surface.

It runs locally and writes either a service catalog or a deterministic quote to standard output. It does not contact a network, collect payment, admit work, execute work, move treasury funds, or mutate Work Credits.

## List services

```bash
npx --no-install tsx \
  scripts/paid_datanet_quote_cli_v1.ts \
  --list-services \
  --format pretty
```

## Generate a quote

```bash
npx --no-install tsx \
  scripts/paid_datanet_quote_cli_v1.ts \
  --request-id request-example-001 \
  --requester-id customer-example-001 \
  --service-code datanet.object-integrity-check.v1 \
  --object-count 2 \
  --total-bytes 1048577 \
  --operator-cost-basis-cents 200 \
  --requested-at-ms 1800000000000 \
  --format pretty
```

The default output format is compact JSON. Use `--format pretty` for human-readable JSON.

## Required inputs

| Option | Meaning |
|---|---|
| `--request-id` | Caller-selected request identifier accepted by the catalog |
| `--requester-id` | Customer or account identifier accepted by the catalog |
| `--service-code` | Exact V1 service code |
| `--object-count` | Unsigned base-10 integer |
| `--total-bytes` | Unsigned base-10 integer |
| `--operator-cost-basis-cents` | Expected direct operator cost in integer USD cents |
| `--requested-at-ms` | Caller-supplied timestamp in integer Unix milliseconds |

The timestamp is explicit rather than read from the system clock so the same inputs always produce the same quote identifier.

## Output rules

Successful service listing and quote generation write exactly one payload to standard output and return exit code `0`.

Validation failures write exactly one compact JSON error payload to standard error and return exit code `2`.

The CLI never prints private keys, wallet material, payment credentials, or treasury data.

## Commercial boundary

A generated quote is not:

- payment collection;
- payment confirmation;
- customer admission;
- execution authorization;
- work completion;
- tax calculation;
- Work Credit issuance;
- settlement.

Every quote keeps operator approval and customer prepayment requirements explicit while automatic execution, automatic payment collection, and treasury access remain disabled.

## Supported services

The CLI reads the already-merged `PAID_DATANET_SERVICE_CATALOG_V1` directly. V1 exposes:

1. `datanet.object-integrity-check.v1`
2. `datanet.public-retrieval-evidence.v1`
3. `datanet.dataset-replication-audit.v1`

## Proof

```bash
npx --no-install tsx \
  scripts/prove_paid_datanet_quote_cli_v1.ts
```

The proof exercises help output, service listing, compact and pretty quotes, deterministic repetition, cost-floor protection, argument validation, catalog boundaries, and disabled-control guarantees.
