# VOID Work Credits (WC) — Earning Surfaces V1 (DRAFT)

Goal: ANY user who does meaningful work for the VOID Network should be able
to earn Work Credits (WC), not just validators.

WC is the *work layer*:
- RewardEngine controls VOID emissions budgets.
- WorkCreditsMinter + category-specific distributors convert those budgets into WC.
- Users earn WC by doing work that passes protocol-defined checks.

This doc lists earning SURFACES (who can earn, for what), not exact percentages.

---

## 1. Validator work (consensus / blocks)

**Who:** Validators / node operators running provably-correct consensus nodes.

**Work type:**
- Keeping a validator online and in the active set.
- Participating in block production / voting correctly.
- Meeting uptime / performance targets.

**How they earn WC:**
- RewardEngine allocates a validator budget (VOID-equivalent) per era/epoch.
- WorkCreditsMinter mints WC against that budget.
- A validator rewards distributor contract splits WC across validators by:
  - stake
  - uptime / participation
  - optional penalties for misbehavior

**Notes:**
- This is the “classic” faucet, but NOT the only one.
- Defined more fully in `docs/VOID-VALIDATOR-REWARD-POLICY-V1.md`.

---

## 2. Agent / AI job work

**Who:** Operators running AI agents / inference nodes / job executors.

**Work type:**
- Executing jobs from JobQueue.
- Producing receipts with valid:
  - job id
  - model id / hash
  - input hash
  - output hash
  - status

**How they earn WC:**
- RewardEngine sets a **job/agent budget** per era.
- When jobs are completed and receipts recorded, an AgentRewards distributor:
  - verifies receipts (on-chain conditions + off-chain policy)
  - pays WC to the agent address that completed the job.

**Notes:**
- This is how *non-validator* compute nodes get paid.
- Coverage metrics (jobs vs receipts) already exist on devnet; they later tie into this WC path.

---

## 3. Dataset / model providers

**Who:** Addresses that register datasets and models in DatasetRegistry / ModelRegistry.

**Work type (examples):**
- Providing high-quality datasets used by agents.
- Providing models referenced by jobs (model hash in receipts).
- Keeping those resources available and up to date.

**How they earn WC (conceptual):**
- RewardEngine assigns a **data/model budget** per era.
- Distribution logic uses:
  - how often a model/dataset appears in successful receipts
  - approved / curated lists
  - maybe quality / rating scores

- WC is minted to dataset/model owner addresses via a dedicated distributor.

**Notes:**
- Prevents agents from capturing ALL value; data + models get a cut.
- Exact formula is a later roadmap item, but we design RewardEngine so this slot exists.

---

## 4. End-user / application-level work

**Who:** Regular users and app builders, not running validators or agents.

This is where “any user can earn WC” really matters. Examples (roadmap):

1. **NullFeed activity**
   - Users posting content, participating in channels, or moderating.
   - Bots / agents curating feeds, detecting spam, etc.
   - WC rewards based on:
     - channel-level budgets
     - engagement / quality signals (NOT raw volume farming)

2. **App builders / integrators**
   - Dapps that route jobs or traffic through VOID Network.
   - WC rewards for:
     - routing jobs to agents
     - onboarding users
     - keeping UIs / endpoints up.

3. **Infra helpers / observers**
   - Non-validator nodes that:
     - provide mirrors
     - archive data / snapshots
     - host frontends
   - Earn WC via measurable contributions (proofs, metrics, attestation).

**How they earn WC (conceptual):**
- Each category gets a dedicated RewardEngine budget slice.
- Category-specific contracts define:
  - what qualifies as “work”
  - how much WC per unit of work
- Examples:
  - `NullFeedRewards` contract that pays WC to addresses with “verified useful activity”.
  - `AppRewards` contract that rewards integrators who drive on-chain volume.

**Notes:**
- This is how “everyone” participates:
  - You don’t need to be a validator or run an AI agent to earn WC.
  - You just have to do something that VOID considers useful and measurable.

---

## 5. Governance / ecosystem / special programs

**Who:**
- People running community programs, audits, bug bounties, etc.
- Could be DAOs, multisigs, or protocol-owned programs.

**Work type:**
- Security audits.
- Protocol upgrades.
- Education / documentation.
- High-value external integrations.

**How they earn WC:**
- RewardEngine can allocate **time-limited program budgets**.
- A governance or admin-controlled contract distributes WC for approved contributions.

**Notes:**
- Must be tightly controlled (multi-sig, AdminGate/UpdateGate).
- Still flows through RewardEngine; no free-for-all minting.

---

## 6. Invariants across ALL earning surfaces

Across validators, agents, data providers, app builders, NullFeed users, etc.:

1. **All WC earning ultimately comes from RewardEngine budgets**
   - Emissions cap is preserved.
   - Every category has a configured budget, never “infinite WC”.

2. **Work must be measurable**
   - Each category defines clear signals:
     - blocks sealed, jobs completed, receipts recorded, content engagement, etc.
   - No generic “click button, get WC”.

3. **Metrics everywhere**
   - For each category we should expose health + budget metrics:
     - `void_mainnet_<category>_rewards_budget_total`
     - `void_mainnet_<category>_rewards_budget_used`
     - `void_mainnet_<category>_rewards_health`

4. **Future extensibility**
   - New earning categories must follow the same pattern:
     - RewardEngine budget → Minter → category-specific distributor → users.
   - No new category gets to bypass caps or monitoring.

---

## 7. Relationship to validator-only docs

- Validators are **one** earning surface with a dedicated policy:
  - See `docs/VOID-VALIDATOR-REWARD-POLICY-V1.md`.
- This doc is the global view:
  - Everyone — validators, agents, data providers, app builders, NullFeed users —
    can earn WC by doing the kind of work VOID cares about.
- Exact percentages per category (and per era) remain TBD and will be set:
  - In RewardEngine econ JSON.
  - In bootstrap scripts.
  - In Prometheus-based SLOs/alerts.

