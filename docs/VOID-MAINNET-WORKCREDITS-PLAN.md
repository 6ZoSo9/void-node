# VOID Mainnet — Work Credits (WC) Plan (Draft v1)

This document captures the *intended* design for Work Credits on VOID mainnet:
how WC relates to VOID, how the WC/VOID pool works, and how validators / users
interact with it via Obelisk Wallet and NullFeed.

It is a planning doc. The real truth lives in:

- Solidity contracts (VoidToken, WorkCreditsToken, WorkCreditsPoolV1, etc.)
- Devnet deployment + tests
- Mainnet bootstrap configs (`config/void-mainnet-bootstrap-mainnet.live.json`)
- Prometheus metrics and health gates

This file is the human-readable anchor tying those together.

---

## 1. Goals

- Make VOID usable without burning it directly for every micro-action.
- Give users an "earnable" balance (Work Credits) that:
  - can be awarded for node/agent work, contributions, etc.
  - can be spent on AI jobs, NullFeed / content actions, future NFTs, etc.
- Keep VOID as the scarce, long-term governance + staking asset.
- Provide clear, auditable tokenomics for:
  - VOID max supply and emissions
  - WC supply and relationship to VOID
- Ensure the system is:
  - cheap enough to use
  - visible in metrics
  - easy to integrate in Obelisk / NullFeed UI.

---

## 2. Tokenomics (VOID baseline)

VOID mainnet tokenomics (locked):

- MAX_SUPPLY: 666,666,666 VOID
- PREMINE:    333,333,333 VOID (genesis Treasury)
- EMISSIONS:  333,333,333 VOID over 100 years, split into 4 eras:
  - Era 1: 177,777,777
  - Era 2:  88,888,889
  - Era 3:  44,444,444
  - Era 4:  22,222,223

The premine goes into a contract-based Treasury (not a hot EOA), and emissions
are governed by the RewardEngine and related contracts.

Work Credits sit *on top* of this: they do not change MAX_SUPPLY but create a
utility layer for network work and usage.

---

## 3. Work Credits — Concept

**Work Credits (WC)** are an internal, on-chain token that:

- Are minted or awarded when users / nodes perform useful work:
  - running validators / relayers
  - executing AI jobs
  - contributing data or models (future)
- Are used to pay for:
  - AI inference jobs
  - content / feed actions (NullFeed, uploads, etc.)
  - future marketplaces (NFT avatars, cosmetics, etc.)
- Are convertible to/from VOID via an AMM pool:
  - **WorkCreditsPoolV1** (WC/VOID pair)

Key idea: VOID is the scarce asset; WC is the working credit. Users mostly see
WC as their "spendable" balance while VOID backs the system, staking and
governance.

---

## 4. One-Time VOID Seed For WC/VOID Pool

We plan a **one-time seed** of **10,000,000 VOID** into the WC/VOID pool at or
near mainnet. Properties:

- Seed is *not* a recurring emission; it is a one-time allocation.
- Seed VOID likely comes from:
  - VoidTreasury → WorkCreditsPoolV1, authorized via AdminGate/ConfigGate.
- Initial pool state:
  - some chosen ratio of WC:VOID to set an initial price
  - designed to be sensible, not insane (no magic high-price assumption).

Important: this 10M VOID is part of the premine and is effectively "locked" in
the liquidity pool. The market plus RewardEngine / Treasury flows sustain the
relationship between WC and VOID over time.

The seed and pool parameters must eventually be:

- encoded in a mainnet bootstrap config (live JSON)
- covered by a Forge script dry-run
- enforced via Prometheus health metrics (e.g. pool size, non-zero reserves).

---

## 5. Contracts Involved (Planning)

Expected core contracts (names illustrative but aligned with current design):

- **VoidToken** — main ERC20-like VOID token (max supply 666,666,666).
- **WorkCreditsToken** — ERC20-like WC token used for work/usage.
- **WorkCreditsPoolV1** — AMM pool for WC/VOID:
  - holds VOID + WC reserves
  - provides swap functions
  - may charge small fees.
- **VoidTreasury** — holds premine and long-term Treasury funds.
- **OpsTreasury** — operational Treasury for paying out incentives.
- **RewardEngine** — handles VOID emissions and possibly WC-related flows.
- **AdminGate / ConfigGate / UpdateGate** — protect parameters and upgrade paths.

Exact wiring for WorkCreditsPoolV1 and RewardEngine must be validated with
Forge scripts and encoded in the mainnet bootstrap PLAN / live configs before
any real broadcast.

---

## 6. Validator / Node Incentives (WC Layer)

Validators already get VOID rewards via RewardEngine, based on stake and
participation. Work Credits add another dimension:

- Validators / relayers can earn WC for:
  - reliably sealing blocks
  - running relayer services for AI jobs / off-chain work
  - providing bandwidth or storage (future, via receipts/attestations).
- WC can then be:
  - spent on AI jobs by the validator themself
  - traded for VOID via WC/VOID pool
  - used for future ecosystem features.

Design notes (to be wired concretely later):

- RewardEngine may mint WC based on observed work metrics and receipts.
- Alternatively, there may be a separate WorkCreditsController that mints WC,
  while RewardEngine handles VOID only.
- For mainnet v1 we keep logic simple and explicit; complexity can be added
  as a later upgrade via UpdateGate.

---

## 7. Obelisk / NullFeed UI Expectations

Obelisk Wallet is the normie-facing interface. The Work Credits plan needs to
be reflected clearly in UI.

**Tabs / sections (baseline):**

1) **Home**
   - Summary of balances (VOID, WC).
   - Recent activity.
   - "Collect pending WC" if there are accrued credits from node/agent work.

2) **Wallet**
   - Send / receive:
     - VOID
     - WC
   - Option to toggle relayer/agent usage (e.g. "Use relayer for gas" on/off).
   - Controls for:
     - viewing pending WC
     - claiming WC into spendable balance.

3) **Trading View**
   - WC/VOID market view:
     - basic price chart (WC per VOID / VOID per WC).
     - current pool reserves.
   - Buy / sell UI:
     - swap VOID → WC
     - swap WC → VOID
   - Show slippage estimates and fees clearly.

4) **NullFeed**
   - Integrated chat feed using the Void Network:
     - channels (#general, #tech, #crypto, #sports, #music, #tv, #movies,
       #games, #religion, #void-dev, #ai-lab, #nullfeed-meta, etc.).
   - Certain actions (posting high-volume, pinning, advanced features) may
     cost WC in the future (not required at mainnet day-1).

5) **NFTs / Avatars (future)**
   - Users can view and manage NFT avatars and cosmetics
     - likely purchasable with WC.

6) **Dashboard**
   - Network health view:
     - head, seals, txroot, devnet/mainnet pillars.
   - Validator stats and Work Credits-related metrics:
     - validator count, stake, WC flows (later).
   - Basic node control surface for validator operators.

All of this is longer-term UI work, but the Work Credits economic and contract
design must assume these flows exist and should be stable over time.

---

## 8. Devnet vs Mainnet

**Devnet:**

- Used for:
  - prototyping WorkCreditsToken and WorkCreditsPoolV1
  - verifying AMM math, swap correctness, and metrics exporters
  - testing AI/JobQueue integration with WC payments.

- Metrics:
  - textfile + Prometheus gauges for:
    - VOID and WC reserves
    - WC per VOID, VOID per WC
    - devnet "health" of the pool and WC flows.

**Mainnet:**

- Must start from a known, audited configuration:
  - explicit VOID + WC reserves at genesis / shortly after.
  - clear ownership (Treasury/OpsTreasury, not EOAs).
  - well-defined permissions via AdminGate/ConfigGate/UpdateGate.

- Later, Work Credits logic may be extended to:
  - content moderation incentives
  - dataset/model curation rewards
  - NullFeed/website hosting credits, etc.

---

## 9. Metrics And Health (Planning)

We intend to expose Work Credits and pool health via Prometheus, examples:

- `void_workcredits_pool_void_reserve_raw`
- `void_workcredits_pool_wc_reserve_raw`
- `void_workcredits_pool_wc_per_void`
- `void_workcredits_pool_void_per_wc`
- `void_workcredits_devnet_health`
- `void_workcredits_mainnet_health` (future)
- `void_mainnet_workcredits_pillar_health` (aggregated).

Planning notes:

- A dedicated script (e.g. `ops/void-workcredits-devnet-pool-exporter.sh`)
  already exists or will exist for devnet.
- Mainnet will get analogous exporters / recording rules.
- Work Credits pillar should eventually feed into mainnet pillars and
  pre-push gates, so we never ship a broken WC/VOID pool.

---

## 10. TODOs Before Real Mainnet Broadcast

Before we do a real VOID mainnet broadcast, we must:

1) Finalize contracts
   - Ensure WorkCreditsToken and WorkCreditsPoolV1 are implemented and tested.
   - Integrate with RewardEngine / Treasury as planned.

2) Lock configuration
   - Encode initial WC/VOID pool state in mainnet PLAN + live JSON.
   - Include the 10M VOID seed and any initial WC amount.
   - Simulate all flows via Forge scripts (PLAN-only).

3) Metrics + health
   - Add textfile exporter(s) for work credits pool on mainnet endpoint.
   - Define recording rules and alerts for:
     - non-zero reserves
     - sane price range (no obvious misconfiguration)
     - availability of pool contracts.

4) Pillars + CI gates
   - Integrate Work Credits health into:
     - planning health scripts
     - mainnet pillars
     - pre-push guards.

5) UI alignment
   - Ensure Obelisk Wallet and NullFeed front-ends:
     - show BOTH VOID and WC balances.
     - provide WC/VOID swap interface.
     - support "collect pending WC" and basic Work Credits plumbing.

This doc is the Work Credits planning anchor. As we lock parameters and finalize
contracts, keep this document aligned with actual on-chain behavior.
