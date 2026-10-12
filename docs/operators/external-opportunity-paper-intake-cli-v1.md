# External Opportunity Paper Intake CLI V1

## Purpose

The Paper Intake CLI V1 is the first end-to-end local operator and AI-agent
surface for the external-opportunity paper pipeline. It composes four already
merged contracts without adding provider polling, credentials, wallet access,
transactions, or live execution:

1. Provider Risk Registry V1
2. Paper Risk Classification Adapter V1
3. Paper Classification Journal V1
4. Paper Classification Journal File Store V1

The CLI accepts one local JSON request file. The request points to a local
provider registry, one sanitized paper observation, and an existing absolute
journal root. Output is one JSON object suitable for shell automation or an
external agent.

## Safety boundary

The CLI is explicit and local only.

- Dry-run is the default when `mode` is omitted.
- Record mode requires the exact confirmation
  `recordPaperOpportunityV1`.
- The lower-level file store still enforces its own independent exact
  confirmation internally.
- Request, registry, and observation paths must be absolute, regular,
  non-symlink files.
- The journal root must already exist and must pass the file-store containment,
  symlink, file-mode, locking, size, entry-count, and `fsync` gates.
- Unknown request fields are rejected. This prevents accidental secret-bearing
  fields from being accepted or echoed.
- The CLI never performs provider discovery, HTTP requests, credential access,
  wallet/key access, transaction construction, transaction submission, runtime
  mutation, service mutation, scheduler mutation, or live execution.

## Request

Use the schema and example:

- `schemas/external-opportunity-paper-intake-cli-v1.schema.json`
- `fixtures/external-opportunity/paper-intake-cli-v1.example.json`

Required fields:

- `schema`
- `marker`
- `version`
- `registry_path`
- `observation_path`
- `allowed_root`
- `recorded_at`

Optional fields:

- `mode`: `dry_run` or `record`; default `dry_run`
- `confirmation`: required only for record mode
- `allow_held_entries`: default `false`
- `max_file_bytes`: default 8 MiB, hard maximum 64 MiB
- `max_entries`: default 10,000, hard maximum 100,000
- `max_line_bytes`: default 1 MiB, hard maximum 1 MiB

Request, registry, and observation files must be distinct.

## Invocation

Dry-run:

```bash
npx --no-install tsx \
  src/external_opportunity/paper_intake_cli_v1.ts \
  --request /absolute/path/request.json
```

Pretty-printed output:

```bash
npx --no-install tsx \
  src/external_opportunity/paper_intake_cli_v1.ts \
  --request /absolute/path/request.json \
  --pretty
```

Help:

```bash
npx --no-install tsx \
  src/external_opportunity/paper_intake_cli_v1.ts \
  --help
```

## Dry-run behavior

Dry-run reads:

- the request file;
- the provider registry;
- the sanitized observation;
- the bounded journal snapshot.

It validates the registry, classifies the observation, and plans the journal
append against current entries. It does not create or modify the journal.

Dry-run statuses:

- `dry_run_ready`: append would be allowed
- `dry_run_duplicate`: classification is already recorded
- `dry_run_held`: source, risk, policy, or journal-plan gate held

## Record behavior

Set:

```json
{
  "mode": "record",
  "confirmation": "recordPaperOpportunityV1"
}
```

Record mode calls the merged file store, which re-reads the journal under an
exclusive sidecar lock and independently re-plans before append.

Record statuses:

- `record_applied`
- `record_duplicate`
- `record_held`
- `record_lock_busy`

The output omits raw request, registry, and observation contents. It includes
their SHA-256 fingerprints, the sanitized classification, bounded plan
metadata, and a path-free summary of the file-store receipt.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | dry-run ready, record applied, or help |
| 10 | duplicate |
| 20 | held by source, risk, policy, plan, or file-store gate |
| 21 | journal lock busy |
| 64 | CLI usage error |
| 65 | request or local input error |
| 70 | unexpected internal hold |

## Agent integration

An external AI agent can generate a request JSON, invoke the CLI, parse one
JSON result, and branch deterministically on `status` and `exit_code`. The
agent cannot gain network, credential, wallet, transaction, service, scheduler,
or live-execution authority through this surface.

The record confirmation is per invocation. It is not a stored permission,
environment variable, daemon setting, or scheduler capability.
