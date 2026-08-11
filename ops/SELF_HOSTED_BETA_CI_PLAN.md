# VOID Node Self-Hosted Beta CI Retirement Record

Marker: `VOID_SELF_HOSTED_BETA_CI_RETIRED_V1`

Status: retired

Retired: 2026-08-11

## Decision

The manual self-hosted beta-proof workflow and its Precision runner path are
retired. Do not register a runner with the former `self-hosted`, `void-node`,
and `beta-proof` labels. Do not recreate the `voidfresh` account or the
former services on ports 4110 and 4314 from this historical record.

## Evidence

The retired workflow depended on an isolated local topology that no longer
exists:

- the `voidfresh` account and home directory are absent;
- the former local endpoints on ports 4110 and 4314 are unavailable;
- the live `void-node-live.service` remains healthy and separate; and
- the workflow's last recent edit only migrated its checkout action, while the
  isolated proof path had not materially changed since 2026-03-23.

Keeping the workflow runnable would imply a live proof environment that is not
present.

## Preserved beta contracts

GitHub-hosted CI continues to run `.ci/beta-proof-guards.sh` against the
maintained beta command and documentation contracts:

- `make beta-help`
- `make public-beta-status`
- `make public-beta-preflight`
- `make wc-wallet-proof`
- `make public-beta`
- `./ops/public-beta-quickstart.sh`

The scripts remain available for bounded operator use and historical review.
Their presence does not prove deployment, external acceptance, wallet authority,
Work Credit mutation, or a live isolated beta topology.

## Reintroduction boundary

Any future self-hosted proof workflow requires a new reviewed design, a
dedicated least-authority host, current topology evidence, explicit runner
registration authority, and a separate activation decision. This record grants
none of those authorities.
