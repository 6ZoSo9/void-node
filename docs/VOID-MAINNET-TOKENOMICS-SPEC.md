# VOID Mainnet Tokenomics — Spec v1

> Status: **DRAFT, STRUCTURE-LOCKED**  
> Source of truth for numbers: **tokenomics JSON + exporters + tests**  
> This document describes the *shape* of VOID mainnet tokenomics and how it is enforced
> in contracts and monitoring. Exact numeric values must always match the JSON + textfile
> exporters and on-chain contracts.

---

## 1. Overview

- **Token name:** VoidStones  
- **Symbol:** `VOID` (`$VOID`)  
- **Chain:** VOID mainnet (chainId 2050)  
- **Max supply gauge:** exported as `void_mainnet_tokenomics_max_supply`  
- **Current max supply:** **666,666,666 VOID** (as seen in `void_mainnet_tokenomics.prom`)

VOID mainnet tokenomics are designed for:

1. **Longevity (10–20+ years):** slow, predictable release.
2. **AI-first usage:** funding agents, datasets, models, and NullFeed/VOID ecosystem apps.
3. **Validator + node incentives:** enough budget to pay people / agents to run real infra.
4. **Controlled governance:** master keys & config gates with rotation / safety, not chaos.

The *code* is the canonical implementation; this spec explains how it hangs together.

---

## 2. Supply model (high-level)

At the top level we have:

- **Hard max supply:** `void_mainnet_tokenomics_max_supply`  
  - Implemented in `VoidToken.sol` and enforced across the system.
- **Premine allocation:** `void_mainnet_tokenomics_premine_total`  
  - Held by `VoidPremineVault.sol` and related vault/treasury contracts.
- **Emissions budget:** managed by `VoidEmissionsController.sol`  
  - For long-term emissions to validators, agents, and ecosystem programs.

### 2.1 Premine vs Emissions (conceptual)

This document intentionally does **not** restate all percentages; instead:

- The **split between premine and emissions** is encoded in the mainnet tokenomics JSON.
- The JSON is validated by:
  - `VoidEmissionsController` tests.
  - `TokenomicsSpec.t.sol`.
  - `ops/void-mainnet-tokenomics-quickcheck.sh`.
- The JSON is mirrored into `void_mainnet_tokenomics.prom` and used by Prometheus rules.

If this spec ever lists specific numbers later, they must be generated from that JSON,
not typed by hand.

---

## 3. Premine layout (conceptual buckets)

The premine is broken into **named buckets** that all live under contracts, not EOAs.
Exact amounts per bucket live in the JSON & contracts; here we just define the roles.

Typical buckets (names may be slightly different in code):

1. **VoidTreasury / Treasury Reserve**
   - Long-term funding for:
     - Core VOID Network development.
     - AI/agent infrastructure (JobQueue, Model/Dataset registries, schedulers).
     - Grants, bounties, and ecosystem programs.
   - Controlled via gated contracts (AdminGate / ConfigGate / UpdateGate paths).

2. **Validator / Node Incentive Pool**
   - Budget to bootstrap:
     - Validators and full node operators.
     - Critical infra like safeboot mirrors, observability, and agent runners.
   - Expected to flow from a cold treasury → ops treasury → hot payout wallets.

3. **Team / Founder / Contributor Vesting**
   - Time-locked allocations, implemented via `VoidFounderTrustVesting.sol` and related logic.
   - Enforces:
     - Cliff + vesting schedule.
     - No arbitrary early unlocks without going through gates / governance.

4. **Ecosystem & Growth / Partnerships**
   - For ecosystem integrations, partnerships, liquidity incentives, and growth programs.
   - Should be governed by transparent on-chain policies and tracked via Prometheus textfiles
     as usage evolves.

5. **Community / Airdrops / User Programs**
   - Budget for wallets, early users, and community events.
   - Distribution mechanics are off-chain (scripts, agents, claim contracts), but
     amounts and usage should be observable and auditable.

6. **NullFeed / App-Specific Reserves**
   - Optional dedicated pools for NullFeed and other VOID-native applications.
   - Used to subsidize posting, storage, AI moderation/curation, and agent work.

Exactly *how much* goes into each bucket is defined in the tokenomics JSON and enforced
in tests; this document defines that these buckets must exist and remain contract-bound.

---

## 4. Emissions & long-term schedule (high-level)

Long-term emissions are orchestrated by **`VoidEmissionsController.sol`**, which:

- Knows total emissions budget (derived from max supply – premine).
- Exposes functions to release emissions over time to:
  - Validators and staking.
  - Agent/operator rewards.
  - Future programs (when activated via governance).

Constraints:

1. **No silent re-minting:** emissions must respect the global max supply cap.
2. **Config changes are gated:** parameters (rates, recipients, epochs) flow through
   `AdminGate` / `ConfigGate` / `UpdateGate`.
3. **Observability:** emissions and payouts should be visible via:
   - On-chain views (supply, balances of treasury contracts).
   - Textfile exporters and Prometheus metrics (e.g. “emissions spent vs budget”).

Details of the decay curve / epoch schedule live in the JSON + tests; this spec only
requires the existence of:
- A finite emissions budget.
- A parameterized but constrained release schedule.
- Gate-protected reconfiguration.

---

## 5. On-chain components

Main contracts involved in tokenomics:

- `VoidToken.sol`
  - ERC-20 core.
  - Enforces the hard max supply.
- `VoidPremineVault.sol`
  - Holds premine.
  - Distributes into the premine buckets under gated control.
- `VoidEmissionsController.sol`
  - Manages emissions budget and schedule.
- `VoidFounderTrustVesting.sol`
  - Enforces founder/team vesting.
- `AdminGate.sol`, `ConfigGate.sol`, `UpdateGate.sol`
  - Control plane for:
    - Who can spend from which pool.
    - How and when parameters change.
    - Upgrade / config changes that touch tokenomics or treasuries.
- `ValidatorSet.sol`
  - Connects validator/staking logic with emissions where relevant.
- `VoidTokenomics` tests (`TokenomicsSpec.t.sol`, plus related tests)
  - Assert that:
    - Premine + emissions = max supply.
    - No bucket exceeds its allocation.
    - Vesting behaves as expected.

If tokenomics JSON and these contracts disagree, **contracts + tests win**; the JSON and
spec must be updated to match.

---

## 6. JSON + exporter + quickcheck pipeline

The numeric tokenomics config is maintained as a **JSON file** (path is encoded in
the ops scripts), and mirrored into a textfile exporter:

- JSON file: `docs/VOID-MAINNET-TOKENOMICS.json` (exact path: see ops script)
- Textfile: `/var/lib/node_exporter/textfile_collector/void_mainnet_tokenomics.prom`

Key metrics include (non-exhaustive):

- `void_mainnet_tokenomics_health`
- `void_mainnet_tokenomics_max_supply`
- `void_mainnet_tokenomics_premine_total`
- Per-bucket gauges (treasury, vesting, validators, ecosystem, community, etc.)

The pipeline is validated by:

- `./ops/void-mainnet-tokenomics-quickcheck.sh`
  - Fetches gauges and checks they are internally consistent.
  - Ensures `void_mainnet_tokenomics_health == 1` before we treat this spec as “green”.
- Solidity tests:
  - `TokenomicsSpec.t.sol` and related tests that reproduce the math in Solidity.

**Rule:** We never hand-edit the `.prom` file. Changes go:
JSON → tests → quickcheck → exporter → `.prom` → dashboards/alerts.

---

## 7. Governance & safety requirements

1. **No naked EOAs for treasury / premine**
   - All premine and emissions are held by contracts (Vaults, Treasury, etc.).
   - EOAs are only signers/controllers, not asset sinks.

2. **Rotatable signer sets**
   - `AdminGate` / `UpdateGate` / `ConfigGate` must support key rotation.
   - Void mainnet key plan (premine, treasury, gates) must align with separate
     governance docs.

3. **Monitoring hooks**
   - Prometheus rules must watch:
     - `void_mainnet_tokenomics_health`.
     - Textfile age for `void_mainnet_tokenomics.prom`.
     - Basic invariants (premine+emissions == max supply, etc. where practical).

4. **Change procedure**
   - Any material change to buckets, emissions, or governance must:
     - Land in the tokenomics JSON.
     - Be covered by updated tests.
     - Pass `void-mainnet-tokenomics-quickcheck`.
     - Update this spec (section 3/4/6) in a new version.

---

## 8. Versioning

This file is versioned along with the codebase.

- **v1 (this document):** structure locked, numbers delegated to JSON + exporters.
- Future versions may:
  - Inline the exact numbers (auto-generated from JSON).
  - Add historical notes on changes (e.g., “v2 rebalances treasury vs ecosystem pool”).

