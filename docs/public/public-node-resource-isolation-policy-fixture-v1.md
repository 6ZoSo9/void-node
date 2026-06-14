# Public Node Resource Isolation Policy Fixture v1

Marker: `VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_DOC_V1`

Route: `/public-node/resource-isolation-policy-fixture-v1.json`

Proof: `ops/mainnet0/public-node-resource-isolation-policy-fixture-v1-proof.sh`

## Purpose

Resource Isolation Policy Fixture v1 is a design-only fixture for future bounded work execution.

It defines CPU, memory, disk, network, timeout, process, path, output, artifact, cleanup, and operator review boundaries before any future earning work can execute.

It does not execute jobs, accept public submissions, open public earning, write ledgers, award Work Credits, swap WC to VOID, move money, mutate validators, or unlock public mutation.

## Current status

`design_fixture_only`

## Safety state

The public route must keep these values false or zero:

- `work_execution_open=false`
- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`
- `validator_mutation_open=false`
- `money_movement_open=false`
- `automatic_ledger_write_allowed=false`

## Required resource policy fields

The v1 fixture requires future resource isolation records to include:

- `policy_id`
- `job_class`
- `cpu_limit`
- `memory_limit_mb`
- `disk_write_limit_mb`
- `network_policy`
- `timeout_seconds`
- `max_processes`
- `allowed_paths`
- `denied_paths`
- `stdout_limit_kb`
- `stderr_limit_kb`
- `artifact_limit_mb`
- `cleanup_required`
- `operator_review_required`
- `ledger_write_allowed`

## Default limits

The v1 fixture defines these default future limits:

- CPU: `one_worker_slot_future`
- memory: `256 MB`
- disk write: `64 MB`
- timeout: `60 seconds`
- max processes: `4`
- stdout: `256 KB`
- stderr: `256 KB`
- artifacts: `16 MB`
- network: deny by default, future allowlist only
- allowed path: future sandbox work directory only
- cleanup required: true

## Denied paths

Future bounded jobs must not access:

- home
- repo
- ssh
- wallets
- system
- service env
- private keys
- runtime data

## Denied job classes now

The v1 fixture denies:

- public mutation
- WC ledger write
- wallet send
- validator mutation
- network-wide scan
- host shell
- private file read
- service env read
- long-running daemon

## Dependencies

Resource Isolation Policy Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`
- `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1`

## Next gate

`operator_controlled_earning_dry_run_fixture_v1`

## Safety claim

Resource Isolation Policy Fixture v1 proves only that VOID has a public, machine-readable design fixture for future bounded work execution.

It does not prove public earning readiness, public execution readiness, production sandbox readiness, ledger readiness, token distribution readiness, or production launch readiness.

## Live rollup guard

Resource Isolation Policy Fixture v1 is included in the public-node live status rollup when the rollup emits:

`resource_isolation_policy_live_status_rollup_green=true`

