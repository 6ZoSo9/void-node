# VOID VPS public seed remote proof v1

Status: remote public proof harness.

This document defines the public proof that must pass after a VPS public seed
gateway exists.

This is not a deployment record.

## Purpose

The remote proof verifies that the public seed gateway exposes only the intended
public VOID surfaces and does not expose private RPC or operator/admin surfaces.

## Required operator input

Optional runtime input:

- VOID_PUBLIC_BASE: public base URL, for example https://seed.voidnetwork.example

If VOID_PUBLIC_BASE is missing, the proof exits cleanly in local-only placeholder
mode.

## Public routes expected

The public seed gateway should expose:

- /
- /participant
- /participant?account=tester
- /__void/ready.json
- /__void/public-bootstrap.json
- /datanet/materialized-status

Some routes may return non-200 during early staging, but the proof must record
the status code and must not treat private surfaces as allowed.

## Private routes expected blocked

The public seed gateway must not expose:

- /rpc
- /admin
- /operator
- /validator/admin
- /debug
- /.env
- /keys
- /wallet
- /secrets

## Port expectations

The public gateway may expose:

- 80
- 443
- optionally 4100 for explicit public seed mode

The public gateway must not expose:

- 8545

## Safety invariants

Required:

- private JSON-RPC must not be public
- 8545 must not be reachable publicly
- admin/operator/validator mutation routes must not be public
- secrets must not be downloadable
- proof must be read-only
- proof must not mutate the remote server
- proof must not send funds
- proof must not perform validator admission
- proof must not change chain authority

## Green condition

For a deployed VPS public seed checkpoint to be green:

- at least one expected public route must be reachable
- /__void/ready.json should return parseable JSON if exposed
- /__void/public-bootstrap.json should return parseable JSON if exposed
- private blocked routes must not return HTTP 200
- tcp/8545 public probe must fail
- local runtime must remain healthy
- local 8545 must remain private-bound
