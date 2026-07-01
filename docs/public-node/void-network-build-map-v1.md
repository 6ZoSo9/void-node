# VOID Network Build Map v1

Marker: `VOID_NETWORK_BUILD_MAP_V1_HOLD`

Status: `public_safe_read_only_build_map_hold`

## Purpose

This document defines the VOID Network Build Map v1 lane.

The lane exists to make the current VOID build easier to understand across the major public surfaces:

- DataNet
- Work Credits
- Mainnet-0 validators
- USDC/VOID buy pool
- Apollyon advisory boundary
- Public node reviewer gateway

## Public routes

- JSON: `/public-node/void-network/build-map-v1.json`
- HTML: `/public-node/void-network/build-map-v1.html`

## Boundary

This lane is static visibility only.

It does not create or expose:

- wallet connection
- signer access
- secret material
- ledger writes
- Work Credit issuance
- Work Credit claims
- VOID transfers
- USDC transfers
- buy pool execution
- validator registration
- validator admission
- validator-set writes
- epoch activation
- DataNet object writes
- peer-pin commands
- mirror commands
- autonomous AI writes

## Work Credits policy note

Work Credits are unlimited and uncapped accounting units for useful verifiable work.

Any funded settlement reference such as `100 WC : 1 VOID` is a conversion/settlement policy reference where funded settlement capacity exists. It is not a lifetime Work Credit supply cap.

## Reviewer summary

This lane is an orientation map.

It is not a ledger, wallet, validator registry, transaction route, execution gate, or authority surface.

The Build Map is safe to publish because it only points to public-safe static surfaces and summarizes current hold state.
