# VOID Network — Work Credits (WC) Specification (v0)

Status: PLAN ONLY (no contracts wired yet)  
Scope: VOID mainnet + devnet, AI-first design, Obelisk/NullFeed integrated.

---

## 0. Purpose

Work Credits (WC) are a **separate token from VOID** used to:

- Pay people (and AI agents) for **doing useful work for the network**.
- Provide a **spend/sink layer** for perks, features, and services.
- Act as the “XP / loyalty / work accounting” system that AI and humans can query.

VOID stays the **base L1 asset** (gas, premine, validator rewards, treasury).  
WC is the **work+perks token** tied to node/agent activity, dashboards, and NullFeed/Obelisk UX.

---

## 1. High-level goals and non-goals

### Goals

1. **AI-first**: WC flows must be easy for agents to reason about:
   - Clear metrics (`void_wc_*`), structured receipts, per-role labels.
   - Stable policy JSON the AI can read/reflect (e.g. `config/void-work-credits-policy.*.json`).

2. **Validator + node incentives**:
   - Reward validators and full nodes for uptime, honest behavior, and “boring but essential” work.
   - Reward other critical roles (agent operators, registry maintainers, infra jobs).

3. **On-ramp for users**:
   - Users can earn WC without needing existing VOID (e.g. running a node, doing jobs).
   - Later swap WC↔VOID via a canonical AMM pool.

4. **Perks and sinks**:
   - WC powers NullFeed, Obelisk, and future features:
     - Channel upgrades, avatars, cosmetic perks, AI boosts, etc.
   - Sinks must be **real** (burn or recycle to treasury), not just number go up.

5. **Upgradeable and safe**:
   - Policy lives in config + governance (AdminGate/UpdateGate, same as mainnet core).
   - Emission parameters tunable without redeploying everything.

### Non-goals (v0)

- WC is **not**:
  - A second “gas” token.
  - A replacement for VOID emissions.
  - A hard-money store of value.
- v0 will **not** rely on fully on-chain Prometheus bridges; we assume off-chain aggregators
  that compute rewards based on metrics + receipts, then feed a controlled on-chain minter.

---

## 2. Entities & contracts (conceptual)

Concrete contract names can change; this is the logical model.

- **WorkCreditToken (WC)**  
  ERC20-like token deployed on VOID mainnet (and optionally devnet mirror).
  - `name  = "VOID Work Credits"`
  - `symbol = "WC"` (or `vWC` if we need symbol uniqueness later)
  - `decimals = 18`
  - Minting restricted to a **controller** contract.

- **WorkCreditController**  
  Contract that:
  - Has exclusive rights to `WC.mint()` and (optionally) `WC.burnFrom()`.
  - Accepts **reward claims** from:
    - `RewardEngine` (validator/node work).
    - `AgentRewardBridge` (JobQueue/Agent receipts).
    - Future bridges (NullFeed work, infra jobs, oracles).
  - Enforces per-period caps and policy.

- **RewardEngine (existing)**  
  - Continues to manage VOID emissions for validators.
  - Gains **optional hooks** to also trigger WC mint events:
    - e.g. `WorkCreditController.mintForValidator(validator, amount, epochId)`.

- **AgentRewardBridge (new)**  
  - Reads JobQueue/ReceiptRegistry state.
  - Verifies that a job was done correctly (off-chain logic for now).
  - Calls `WorkCreditController.mintForAgent(operator, amount, jobId)`.

- **WC sinks (service adapters)**  
  Examples:
  - `NullFeedCredits`: burns or escrows WC for channel upgrades, avatars, etc.
  - `ObeliskPerks`: takes WC for wallet-side perks or priority features.
  - Future: `WCAvatarMarket`, `WCBotStore`, etc.

Contracts are hooked behind AdminGate/UpdateGate so we can rotate controllers and sinks.

---

## 3. WC lifecycle

### 3.1 Mint sources (who creates WC?)

**Single source of truth:** `WorkCreditController`.

It mints WC in three broad categories:

1. **Validator / Node work**
   - Rewards for:
     - Running a validator in good standing.
     - Running full nodes with certain roles (safeboot, bootstrap, archive, etc.).
   - Inputs (conceptual):
     - Epoch-based performance metrics (uptime, missed blocks penalties).
     - Safeboot and last-mile health signals (from Prometheus, via off-chain verifier).
   - Output:
     - `mintForValidator(validator, amount, epochId)`.

2. **Agent / Job work**
   - Rewards for:
     - Successfully processing AI jobs through JobQueue (Receipts).
   - Inputs:
     - `ReceiptRegistry` events (job completed, by which operator).
     - Optional model/dataset multipliers (heavier jobs earn more WC).
   - Output:
     - `mintForAgent(agentOperator, amount, receiptId)`.

3. **Infra / community work (optional, gated)**
   - Manual/curated mints for:
     - Running mirrors, archives, NullFeed hosting, docs, etc.
   - Inputs:
     - Signed admin instructions or on-chain proposals.
   - Output:
     - `mintForInfra(addr, amount, reasonHash)`.

### 3.2 Holding and transferring

- WC is a normal ERC20:
  - Transferable, approvable, LP-able.
- Holders:
  - Validators, node runners, agent operators.
  - Regular users who receive WC (airdrop, tips, job payouts, etc.).

### 3.3 Spending and sinks

When users **spend WC**, one of two things happens:

1. **Burn**: WC is destroyed.
   - Used for **hard sinks** where we want permanent scarcity:
     - Special avatars.
     - Vanity names.
     - One-time, “soul-ish” unlocks.

2. **Recycle**: WC goes into a **WC sink vault** (treasury bucket).
   - Later used as:
     - Rewards pool (redistributed to workers).
     - Governance/DAO treasury.

Each sink contract explicitly declares:
- `mode = BURN | RECYCLE`
- `sinkTag` for metrics (e.g. `"nullfeed.channel_upgrade"`).

---

## 4. Earning paths (v1 sketch)

Specific numbers go into a policy JSON; here we define **shape**.

### 4.1 Validators / full nodes

Per epoch (or time window), for each validator/node:

- Inputs:
  - `uptime_score` (0–1)
  - `lastmile_score` (0–1)
  - `safeboot_score` (0–1)
- Policy:
  - `base_wc_per_epoch` for validators.
  - Multipliers for high uptime / low drift / healthy last-mile.
- Effect:
  - Well-behaved validators accumulate WC on top of VOID emissions.
  - Safeboot/backup nodes can have separate policy (e.g. `role="safeboot"`).

### 4.2 Agent / JobQueue operators

For each completed job `J` with receipt `R`:

- Inputs:
  - `job_weight` (e.g. CPU/GPU cost, data size, priority).
  - `success` / `failed` outcome.
- Policy:
  - `wc_per_unit_weight` (per job type/model).
  - Caps per operator per epoch to avoid abuse.
- Effect:
  - Operators who run agents earn WC.
  - Encourages an active AI ecosystem on VOID.

### 4.3 Infra / community

- Rare / curated path.
- Gated behind AdminGate+UpdateGate or separate governance.
- Used for:
  - Docs, tutorials, bug bounties, marketing, etc.
- Must be transparent in metrics:
  - `source="infra"` with `reasonHash`.

---

## 5. WC sinks and usages (v1 sketch)

This is where WC becomes visible to humans.

### 5.1 NullFeed

Initial sinks (all optional, policy-driven):

- **Channel upgrades**:
  - Public channel → “boosted” channel (priority indexing, higher limits).
  - Private/passworded channels with extra features.

- **Perks**:
  - Enable image posting in a channel.
  - Enable bots/integrations for a channel.
  - Pinned messages count increased.

- **Identity / cosmetic**:
  - Vanity handle reservation (e.g. `@name`).
  - Channel badges or flair.

Most of these should **BURN** WC (hard sink), with some **RECYCLE** options for revenue-sharing later.

### 5.2 Obelisk Wallet / dashboard

Possible WC uses:

- UI themes, cosmetic upgrades.
- Priority access to certain AI/agent features.
- Higher rate limits for free-tier users (bounded by policy).

Primary rule: **no pay-to-cheat consensus**. WC must not buy validator votes or override safety.

### 5.3 Future sinks

- Avatar marketplace (NFTs purchasable with WC).
- AI bot marketplace (pay WC to deploy/host bots).
- Dataset/model access tiers.

All of these must be **tagged** in metrics so we can see where WC is going.

---

## 6. WC ↔ VOID AMM pool

We plan a canonical WC↔VOID liquidity pool (could be an in-house AMM).

High-level constraints:

- **Single canonical pair** we advertise in dashboards.
- Fee model:
  - Small fee, partly to LPs, partly to a WC or VOID treasury bucket.
- Governance:
  - AdminGate/UpdateGate can:
    - Pause pool.
    - Adjust fee parameters.
    - Adjust max slippage bounds for protocol-owned swaps.

Behavior:

- Users who earn WC but want VOID:
  - Swap via the AMM.
- Users who want exposure to WC and support the system:
  - Provide liquidity in the WC/VOID pair.

We do **not** rely on CEX listings; AMM is the baseline.

---

## 7. Metrics & observability (WC)

We need WC-visible in Prometheus and dashboards from day one.

### 7.1 Core gauges/counters

At minimum:

- `void_wc_total_supply`
  - Gauge; mirrors `WC.totalSupply()`.

- `void_wc_minted_total{source,role}`
  - Counter.
  - `source` examples: `"validator"`, `"agent"`, `"infra"`.
  - `role` examples: `"validator"`, `"full_node"`, `"safeboot"`, `"agent_operator"`.

- `void_wc_burned_total{sink}`
  - Counter.
  - `sink` examples: `"nullfeed.channel_upgrade"`, `"nullfeed.avatar"`, `"obelisk.theme"`.

- `void_wc_spent_total{sink,mode}`
  - Counter.
  - `mode` = `"BURN"` or `"RECYCLE"`.

- `void_wc_actor_balance{actor_type}`
  - Optional: textfile-based rollups (e.g. total WC held by validators vs agents).

### 7.2 Health & policy metrics

- `void_wc_policy_version`
  - Gauge; label `version="<semver>"` via `info` metric.

- `void_wc_emissions_cap_current`
  - Gauge; current per-epoch cap.

- `void_wc_emissions_used_current`
  - Gauge; how much of the cap has been used this epoch.

We’ll also want alert rules like:

- “WC emissions > 90% of cap for N epochs in a row.”
- “Burn ratio < X% over 30 days” (too little WC being burned).

### 7.3 Textfile exporters / ops

We’ll likely install one or more exporters:

- `ops/void-wc-metrics-exporter.sh`
  - Pulls on-chain data (via cast or RPC).
  - Writes `void_wc_*` metrics into node_exporter textfile dir.

This matches how we already treat mainnet pillars, keys, etc.

---

## 8. Config / policy files

Policy should live in versioned JSON:

- `config/void-work-credits-policy.dev.json`
- `config/void-work-credits-policy.mainnet.template.json`
- `config/void-work-credits-policy.mainnet.live.json` (LUKS/ignored; never committed)

Example fields (conceptual):

- `version`
- `emissionCaps`:
  - per role, per epoch.
- `multipliers`:
  - uptime/health multipliers.
- `sinks`:
  - which sinks burn vs recycle, and pricing.

These configs are validated by scripts (similar to mainnet bootstrap PLAN).

---

## 9. Roadmap / phases

### Phase A — Spec & planning (THIS DOC)

- Define WC concept, lifecycle, and metrics (done here).
- Add policy JSON templates and .gitignore guards.
- Add Prometheus metric stubs (even if values are zero).

### Phase B — Devnet implementation

- Deploy WC + controller on devnet (chainId 2050 anvil).
- Hook RewardEngine & Agent bridge to mint WC on devnet.
- Add basic NullFeed/Obelisk sinks on devnet.
- Build an **Obelisk/NullFeed dashboard** panel showing:
  - WC balances, earnings, and burns over time.

### Phase C — Mainnet wiring

- Deploy WC + controller on VOID mainnet.
- Wire RewardEngine + Agent bridge under AdminGate/UpdateGate.
- Turn on conservative emissions + sinks.
- Announce WC as the “work + perks” layer.

### Phase D — Advanced features

- Avatar/NFT market with WC.
- Rich NullFeed per-channel customization (bots, options).
- More sophisticated AI-agent reward policies.

---

## 10. Guardrails

- VOID remains the **hard cap / main token**; WC must not dilute VOID tokenomics.
- WC mint must always go through:
  - Configured policy → governance → `WorkCreditController`.
- All manual/infra mints must be:
  - Traceable via metrics and events.
  - Subject to caps and governance controls.

