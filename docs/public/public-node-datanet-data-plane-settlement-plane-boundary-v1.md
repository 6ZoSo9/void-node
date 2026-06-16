# Data Plane / Settlement Plane Boundary v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_DOC_V1 -->

This document establishes the Mainnet-0 architecture boundary between VOID's Data Plane and Settlement / Coordination Plane.

The scaling thesis is simple:

VOID scales DataNet by keeping the ledger lean.

The ledger coordinates roots, receipts, challenges, identity, permissioning, and accounting.

The Data Plane carries objects, manifests, retrieval, mirroring, tester copy packs, and offline verification.

## Current Mainnet-0 claim

This public node is a proof and coordination surface.

It does not claim production-grade financial consensus.

It does not claim high-value financial execution.

It does not expose public mutation.

It does not expose public shell execution.

It does not write raw DataNet payloads into ledger state.

## Invariants

- `raw_datanet_payload_written_to_ledger=false`
- `public_route_can_mutate_ledger=false`
- `public_route_can_execute_shell=false`
- `current_mainnet0_financial_execution_claim=false`
- `production_consensus_claim=false`
- `future_hardening_required=true`

## Why this matters

VOID should not scale by turning the chain into a hard drive.

The coordination layer should stay lean.

The data layer should scale outward through DataNet storage, retrieval, mirroring, challenges, and offline verification.

This artifact is intentionally bounded. It proves the current Mainnet-0 boundary. It does not claim future production consensus is already solved.

PROTECT THE CORE.
