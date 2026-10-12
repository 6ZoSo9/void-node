# VOID Startup Storage Readiness Gate v1

**Marker:** `VOID_STARTUP_STORAGE_READINESS_GATE_V1`

**Status:** Startup storage readiness route guard; no authority change.

## Purpose

This patch prevents public storage-derived truth routes from serving while startup storage repair is pending, failed, or skipped by default.

The gate closes the gap where `autoRepairDataDir` ran asynchronously after HTTP bind while public storage-derived routes could already serve.

## States

- `pending`: startup repair scheduled/running; gated routes return 503
- `green`: startup repair resolved; gated routes pass
- `failed`: startup repair rejected; gated routes return 503
- `skipped`: `VOID_SKIP_AUTOREPAIR=1`; gated routes return 503 by default

`skipped` is not `green`.

A skipped node may serve gated routes only with explicit override:

`VOID_ALLOW_PUBLIC_STORAGE_WITH_REPAIR_SKIPPED=1`

## Gated storage-derived prefixes

- `/head`
- `/head.txt`
- `/api/head`
- `/blocks/`
- `/tx/lookup`
- `/tx/receipt`
- `/tx/status`
- `/receipts/`
- `/mempool`
- `/mempool/`
- `/datanet/v1/`
- `/__void/mainnet0/validator-candidate-registry/`
- `/__void/runtime/validator-truth/`

## Non-goals

This patch does not:

- change SegStore
- change the WAL model
- add a public repair trigger
- activate public mutation
- grant signer or wallet access
- authorize execution
- move funds
- mutate ledgers
- gate `/peers` or `/peers/registry`
