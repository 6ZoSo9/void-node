# External Opportunity Agent Intake Capability V1

## Status

This document defines a static, offline, machine-readable capability contract for outside AI agents that need to determine whether they can use the VOID External Opportunity Paper Intake CLI V1.

The contract does not expose a network endpoint. It does not authenticate agents, accept paid work, award Work Credits, access wallets, construct transactions, or authorize live execution.

## Purpose

The capability manifest gives an external agent enough deterministic information to decide whether its requested interaction is compatible with the current paper-only intake surface.

It binds:

1. the provider risk registry;
2. the paper risk classification adapter;
3. the append-only paper classification journal planner;
4. the bounded journal file store;
5. the Paper Intake CLI;
6. the Paper Intake CLI request schema and example.

Each binding includes a repository-relative path and an exact SHA-256 digest.

## Capability identity

- Marker: `VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1`
- Schema: `void-external-opportunity-agent-intake-capability-v1`
- Capability ID: `void.external_opportunity.paper_intake.v1`
- Version: `1`
- Availability: `offline_static_contract`
- Manifest fingerprint algorithm: SHA-256 over canonical JSON after removing `manifest_fingerprint_sha256`

The V1 manifest fingerprint is:

`c4e9ea03631b39962753cd7f91c198bbba1e4081c716da24e27f14a64f7bfd7a`

## Transport contract

V1 is invoked locally:

```text
tsx src/external_opportunity/paper_intake_cli_v1.ts --request /absolute/request.json [--pretty]
```

Request delivery is an absolute local JSON file. Results are machine-readable JSON.

- Exit codes below 64 are written to standard output.
- Usage and input errors with exit codes 64 or higher are written to standard error.
- There is no HTTP endpoint, socket listener, remote procedure call, webhook, or autonomous observer.

## Supported modes

### `dry_run`

`dry_run` is the default mode.

- It may read only explicitly supplied local files.
- It may read the bounded journal snapshot for duplicate and policy planning.
- It does not write the journal.
- It does not require a confirmation token.

Supported statuses:

- `dry_run_ready`
- `dry_run_duplicate`
- `dry_run_held`
- `input_held`
- `usage_held`
- `internal_held`

Supported exit codes: `0`, `10`, `20`, `64`, `65`, and `70`.

### `record`

`record` is non-default and may append one bounded paper classification journal entry.

It requires the exact confirmation:

`recordPaperOpportunityV1`

The lower-level journal file store retains its own independent confirmation and containment checks.

Supported statuses:

- `record_applied`
- `record_duplicate`
- `record_held`
- `record_lock_busy`
- `input_held`
- `usage_held`
- `internal_held`

Supported exit codes: `0`, `10`, `20`, `21`, `64`, `65`, and `70`.

## Request contract

The manifest binds the merged request schema:

`schemas/external-opportunity-paper-intake-cli-v1.schema.json`

SHA-256:

`1b1646547a406cf89116f007de2977607970131ab5f3b26517d98ec706156eba`

Maximum request file size: 131,072 bytes.

The request, provider registry, and observation paths must be:

- absolute;
- regular files;
- non-symlinks;
- mutually distinct.

The allowed journal root must be an existing absolute non-symlink directory.

The intake CLI rejects unknown top-level request keys.

## Negotiation request

`negotiateExternalOpportunityAgentIntakeCapabilityV1` accepts a deterministic negotiation request with:

- accepted capability versions;
- requested mode;
- planned request size;
- acceptance of explicit confirmation;
- optional required request-schema hash;
- optional required manifest fingerprint;
- optional required result statuses;
- optional accepted exit codes;
- explicit booleans for capabilities the agent requires.

A negotiation is accepted only when every requested property is supported.

Reasons are deduplicated and sorted.

## Explicitly unsupported requirements

V1 holds negotiation when an agent requires any of the following:

- network endpoint;
- network listener;
- authentication secret;
- provider polling;
- paid-work submission;
- Work Credit earning;
- wallet or key access;
- transaction construction;
- transaction submission;
- runtime mutation;
- service mutation;
- scheduler mutation;
- live execution.

These are truthful capability limits, not temporary implied promises.

## Security boundary

The manifest and negotiation functions are pure except for SHA-256 calculation.

The proof may read the repository fixture, schema, source, and proof files. It performs no filesystem write.

The capability contract itself:

- does not read a request;
- does not read or write a journal;
- does not contact a provider;
- does not open a listener;
- does not access secrets;
- does not mutate runtime state;
- does not submit paid work;
- does not award Work Credits;
- does not construct or submit transactions.

## Proof obligations

The focused proof verifies:

- the published fixture equals the deterministic generated manifest;
- the manifest fingerprint is exact;
- valid dry-run and record negotiations are accepted;
- record mode advertises the exact confirmation;
- unsupported version, size, schema hash, fingerprint, status, and exit-code requirements are held;
- all unsupported authority requirements are held;
- mutation of the manifest invalidates its fingerprint and exact contract;
- unknown negotiation keys are rejected;
- no raw empty catch exists in the new source or proof;
- no filesystem write, network activity, secret access, wallet activity, transaction activity, paid-work submission, Work Credit earning, runtime mutation, service mutation, scheduler mutation, or live execution occurs.
