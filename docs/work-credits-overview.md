# VOID Work Credits — Overview (PLAN)

This document is the entrypoint for the VOID Work Credits (WC) system.
It summarizes the design and points to the detailed docs.

## 1. Components

The Work Credits system consists of:

- **Economics & flows** — high-level narrative and 10M VOID seed:
  - `docs/work-credits-plan.md`
  - `docs/work-credits-economics.md`
- **Contracts & plumbing** — on-chain pieces and interfaces:
  - `docs/work-credits-contracts.md`
- **UI/UX & dashboards** — how WC shows up to humans:
  - `docs/work-credits-dashboard-ui.md`

These documents are PLAN-only and describe how WC integrates with:

- VOID mainnet bootstrap and premine flows,
- UptimeVaultLLP (LLP) and relayer incentives,
- Obelisk Wallet and NullFeed.

## 2. Design goals (short)

- Reward **real work**: validation, relaying, agents (future).
- Keep WC tightly coupled to VOID:
  - Seeded from 10M VOID in the premine,
  - WC↔VOID AMM pool as the canonical price reference.
- Make everything AI-first:
  - Receipts, metrics, and dashboards are machine-friendly.
- Keep on-chain changes minimal at first:
  - Mainnet launch first,
  - WC contracts and wiring can be activated in later upgrades.

## 3. Implementation phases (PLAN)

1. **Phase 0 — Mainnet core**
   - Launch VOID mainnet with current tokenomics and validator set.
   - Treasury + RewardEngine wired and healthy.

2. **Phase 1 — WC contracts + LLP**
   - Deploy WC token + LLP contracts (UptimeVaultLLP, etc.).
   - Wire 10M VOID split from VoidTreasury to LLP + relayer buckets.
   - Stand up WC metrics + exporters.

3. **Phase 2 — Relayers + WC earnings**
   - Bring relayers online and start emitting WC for uptime/coverage.
   - Ensure `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m` stays green.

4. **Phase 3 — UI/UX integration**
   - Obelisk WC dashboard wired to contracts + metrics.
   - NullFeed WC overlay + perks live (channel boosts, cosmetics, etc.).

5. **Phase 4 — Agents + advanced sinks (future)**
   - WC for agent work (JobQueue, receipts, PoP).
   - WC sinks for avatar markets, data unions, etc.

## 4. Status notes

- As of this PLAN document:
  - Mainnet PLAN + keys + AI + WC + relayers composite health metric is expected
    to be `1` when the planning/exporter stack is green:
    - `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m`
  - LIVE JSON still carries placeholder (0x0) addresses for WC-related roles and
    relayers until the real mainnet key ceremony.

Implementation work must keep this overview in sync with:

- `config/void-mainnet-bootstrap-mainnet.live.json`,
- The WC scripts under `ops/void-work-credits-*.sh`,
- The docs referenced above.

