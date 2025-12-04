# VOID Network — Docs Index

This directory contains architecture, ops, and planning documents
for VOID Network and VOID mainnet.

## Work Credits (PLAN)

Design and planning docs for the VOID Work Credits (WC) system:

- **Overview**
  - `docs/work-credits-overview.md`
- **High-level plan & narrative**
  - `docs/work-credits-plan.md`
- **Economics & flows (10M VOID seed, LLP, relayers)**
  - `docs/work-credits-economics.md`
- **Contracts & plumbing (WC token, LLP, relayer wiring)**
  - `docs/work-credits-contracts.md`
- **Dashboard / UI (Obelisk + NullFeed integration)**
  - `docs/work-credits-dashboard-ui.md`

These documents are PLAN-only and describe how WC will integrate with:

- Mainnet bootstrap and premine flows
- UptimeVaultLLP (LLP) and relayer incentives
- Obelisk Wallet and NullFeed dashboards

Implementation and broadcasts must follow the health gates and PLAN
scripts under:

- `ops/void-work-credits-mainnet-*.sh`
