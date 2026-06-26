# VOID SegStore Hardening Patch v1

**Marker:** `VOID_SEGSTORE_HARDENING_PATCH_V1`

**Status:** Source-level hardening patch; no authority change.

## Purpose

This patch hardens SegStore durability behavior without changing route behavior, authority, public mutation, signer/wallet access, execution authority, or ledger authority.

## Changes

- Route segment `meta.json` writes through the existing atomic write pattern.
- Route WAL prune rewrites through atomic tmp-then-rename text writes.
- Preserve existing WAL-before-write and constructor replay behavior.
- Preserve append-in-place `blocks.bin` and sparse index model.

## Boundary

This patch does not:

- activate new authority
- enable public mutation
- grant signer or wallet access
- authorize execution
- move funds
- mutate ledgers
- change HTTP route behavior
- add startup readiness gate

Startup storage readiness gating remains a separate future artifact.
