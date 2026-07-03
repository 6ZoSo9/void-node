# VOID Local Multi-Box Runtime Status v1

Marker: `VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1`

This document records the current public-safe local runtime status for VOID Network.

As of the Precision recovery checkpoint on 2026-07-03, VOID is observed running locally across multiple machines:

- Precision / `zoso-Precision-Tower-7810`
- Alienware
- Nimo/N153B

Precision is the source-of-truth live node/worktree at `~/dev/void-node`.

The Precision live node recovered after power loss and returned green:

- branch: `main`
- head: `57015d528408b0b73db47c7e4c608e5fee3c0a6b`
- HTTP: `4100`
- P2P: `4700`
- readiness: true
- observed head: `1856587`
- observed gap: `0`
- public base URL: `http://108.232.1.111:4100`

## Boundary

This status is public-safe runtime visibility only.

It does not enable or claim:

- wallet execution
- money movement
- buy-VOID fulfillment
- WC-to-VOID swap execution
- validator admission
- validator mutation
- public mutation routes
- public self-serve WC earning
- public internet mesh completion
