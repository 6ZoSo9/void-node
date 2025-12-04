# VOID Work Credits — Economics (PLAN)

This document describes the economic design for Work Credits (WC) on VOID mainnet.
It is a PLAN-only stub; nothing here is deployed or wired yet.

## 1. Roles, actors, and flows

Core actors:

- **Validators** — run full nodes, produce blocks, keep the chain alive.
- **Relayers / infra ops** — run services that bridge users, agents, and other chains to VOID.
- **Agents / Job executors (future)** — AI / off-chain workers that complete verifiable jobs.
- **End users** — hold VOID and WC, use apps (NullFeed, wallets, marketplaces).

High-level WC flow:

1. Validators / relayers / agents do work.
2. The network measures that work (uptime, blocks, jobs, receipts).
3. A governed controller mints **Work Credits (WC)** to reward that work.
4. WC can be:
   - Swapped for **VOID** via a WC↔VOID pool,
   - Spent in WC-denominated markets (NFT avatars, NullFeed perks, etc.),
   - Burned as part of on-chain actions (fees, boosts, future mechanics).

VOID stays the hard asset. WC is the “earned work layer” backed by VOID liquidity + long-term demand for network services.

## 2. 10M VOID seed and backing

We dedicate **10,000,000 VOID** (10M) as a canonical seed for WC plumbing, as
already reflected in the PLAN scripts:

- **Total seed:** 10,000,000 VOID  
  (in wei: `10000000000000000000000000`)

Split (as in `wc-mainnet-plan-sim`):

- **9,800,000 VOID** → `UptimeVaultLLP` (LLP seed)
- **200,000 VOID** → Relayer funding / bootstrap pool

Interpretation:

- LLP seed backs long-term WC emissions and/or validator-side rewards.
- Relayer seed ensures we can actually fund early relayer operations and
  incentives without janky one-off transfers.

This 10M seed is **not** the whole emissions schedule. It’s the **plumbing
backing** for Work Credits and WC↔VOID liquidity.

## 3. WorkCreditsToken behavior (WC vs VOID)

**VOID**:

- Hard capped per our mainnet tokenomics (333,333,333 premine + 333,333,333 emissions
  over 100 years, locked elsewhere).
- Used for:
  - Fees / gas,
  - Staking in ValidatorSet,
  - Treasury operations,
  - Backing liquidity pools.

**WC (Work Credits)**:

- ERC20-like token (see `docs/work-credits-contracts.md`), but with tight governance:
  - Mint only via a controller governed by `AdminGate` / `UpdateGate`.
  - Burn to pay for certain network perks or features.
- **No fixed cap** in this PLAN:
  - Instead we cap **emission rate** and **backing ratios**, not total supply.
- WC is **always earned**:
  - You don’t get WC “for free”; you do something:
    - Run a validator,
    - Run a relayer / infra,
    - Complete jobs as an agent (future).

Transferability options (PLAN):

- **Default stance:** WC is **transferable ERC20** on VOID mainnet to keep UX
  simple and make WC↔VOID AMMs straightforward.
- We reserve the right (via `AdminGate` + `UpdateGate`) to:
  - Add transfer hooks,
  - Add optional “non-transferable” WC flavors later if we want SBT-style credits.

## 4. Earning WC (who gets what, roughly)

We want WC emissions to track **actual contribution**, not just capital.

### 4.1 Validators

Validators already earn VOID via the `RewardEngine` + emissions schedule.

Plan for WC:

- For each epoch (or block interval) where a validator meets:
  - Uptime thresholds,
  - Non-slash conditions,
  - Quality metrics (e.g., no bad headers, no griefing),
- We allocate **a WC budget** per epoch:

Example PLAN sketch (numbers are placeholders, to be tuned later):

- Let `wcEpochBudget` be X WC per epoch.
- Each validator i gets:

  - `WC_i = wcEpochBudget * (weight_i / total_weight)`

Where:

- `weight_i` may combine:
  - Stake,
  - Uptime,
  - Participation score (attestations, proposals, etc.),
  - Future metrics.

All of that is implemented via `RewardEngine` + `WorkCreditsController`.

### 4.2 Relayers and infra workers

Relayers earn WC for:

- Successfully delivering transactions / jobs,
- Keeping certain queues drained,
- Providing coverage for regions / time windows that are under-served.

Emission ideas (PLAN):

- Per-task rewards:
  - Each completed job / relayed bundle yields a small WC reward.
- Availability / SLA rewards:
  - Extra WC for maintaining low-latency endpoints or target uptime.

The **200k VOID** relayer seed does **not** get “spent” randomly. It backs:

- Relayer `VOID` budgets for gas,
- Potential WC buybacks / AMM seeding for relayer payouts.

### 4.3 Agents / Job executors (future)

Agents interacting with JobQueue or other agent frameworks on VOID:

- Submit receipts of completed work (already tied into our receipts pipeline).
- Once a receipt is verified / settled:
  - `WorkCreditsController` mints WC to the agent’s address.

This links WC directly to AI/agent work, making WC an “AI-first” work token.

## 5. WC↔VOID pool (AMM design, PLAN)

We want a **canonical WC↔VOID AMM pool** on VOID mainnet to:

- Let workers swap WC → VOID,
- Let users buy WC with VOID,
- Provide a pricing signal for WC based on actual demand.

PLAN:

- Use a standard constant-product AMM (`x * y = k`) as a baseline:
  - Either:
    - Native DEX contracts on VOID, or
    - An in-house minimal pool (`WorkCreditsPool`) if we don’t want external deps.
- Seed the initial pool with a small portion of the 10M VOID backing:
  - Example starting point (tunable):
    - `seedVOID_pool = 1,000,000 VOID` from the 9.8M LLP bucket.
    - `seedWC_pool` is minted WC allocated to the pool at genesis.

Governance:

- LP tokens belong to a governed entity:
  - Either `VoidTreasury`, `OpsTreasury`, or a dedicated `WCPoolTreasury`.
- No random EOA owns the core LP; this is network plumbing, not yield farming.

Price dynamics:

- Early on, WC emission will probably outpace organic demand.
- We can counterbalance via:
  - Limited emission rates,
  - Periodic treasury operations to stabilize WC price bands,
  - WC sinks (see below).

## 6. WC sinks: how WC gets burned / reused

We need **real sinks** so WC isn’t just a one-way faucet.

Planned sinks:

1. **NFT avatar marketplace (PLAN)**:
   - Users buy VOID-themed / NullFeed-themed NFTs using WC.
   - WC used in purchases is partially or fully burned.

2. **NullFeed / Obelisk perks**:
   - WC to:
     - Boost posts/channels,
     - Unlock cosmetic themes,
     - Priority posting / pinning.
   - WC paid for these is either burned or moved to a “perks treasury” that
     periodically burns / redistributes.

3. **Protocol boosts (later)**:
   - Validators could burn WC for:
     - Temporary priority on certain queues,
     - Voting weight in meta-governance (without touching VOID voting).

Every sink we add must:

- Be clearly defined in docs,
- Have on-chain events and metrics (Prometheus) so burns and flows are auditable.

## 7. Governance and safety rails

WC is tightly bound to core governance:

- Mint/burn rights:
  - Controlled by `AdminGate` + `UpdateGate`.
  - Mapped to roles (e.g., `wcGovernance`, `wcMinterAdmin`) in:
    - `config/void-mainnet-bootstrap-mainnet.live.json`,
    - `/mnt/voidkey/meta/mainnet-roles-mapping.txt`.

Safety rails:

- **Rate limiting**:
  - Per-epoch WC emission caps in `WorkCreditsController`.
- **Circuit breakers**:
  - If WC emission or burn metrics look wrong (Prometheus alerts), we can:
    - Pause minting,
    - Freeze AMM interactions involving WC,
    - Revert to a safe minimum state.

## 8. Integration with monitoring and pillars

Monitoring expectations:

- New Prometheus metrics will track:
  - WC total supply,
  - WC minted/burned per epoch,
  - LLP VOID balances,
  - Relayer VOID/WC balances,
  - WC↔VOID pool state (reserves, implied price band).

The existing composite:

- `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m`

already assumes WC/plumbing is part of “ready for mainnet” health. When we
implement real contracts:

- We’ll extend WC metrics into the mainnet pillars exporter.
- Pillar health will go red if:
  - WC emissions deviate from policy,
  - LLP or relayer seed drops below thresholds,
  - WC pools are out-of-bounds.

## 9. Status and constraints

- All WC behavior here is **PLAN only**.
- LIVE JSON currently has:
  - WC roles (wcGovernance, wcMinterAdmin, lpTreasury, relayerAdmin) set to `0x0`.
  - A relayer stub entry with `0x0` address.
- No WC contracts or AMM pools exist in the repo yet.
- We will only:
  - Wire WC roles in LIVE JSON after the real mainnet keys ceremony.
  - Deploy WC contracts / pools after:
    - VOID mainnet core is live and stable,
    - Safeboot / devnet pillars are green,
    - WC design has had a second pass review.

