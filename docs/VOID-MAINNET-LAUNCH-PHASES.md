# VOID Mainnet – Launch Phases

**Status:** Draft, but aligned with current keys + PLAN + governance docs.  
**Goal:** Make it explicit how VOID mainnet comes online, even if we start as a solo validator, and how we grow from there.

This doc does **not** define tokenomics or governance internals; those live in:

- `docs/VOID-MAINNET-GOVERNANCE-MODEL.md`
- `docs/VOID-MAINNET-BOOTSTRAP-CEREMONY.md`
- `docs/VOID-MAINNET-VALIDATORS-AND-REWARDS.md`

This is strictly: **“what phase are we in, who is validating, and what are we promising?”**

---

## Phase 0 – Deadchain / Rehearsal (now)

**State:**

- We are on devnet/anvil and local chains only.
- Mainnet contracts compile and test.
- Mainnet bootstrap script (`VoidMainnetBootstrapMainnet`) exists in **PLAN-only** mode:
  - `plan(configPath)` = read JSON, check invariants, log narrative.
  - `run(configPath)`  = call `plan()`, then **always revert** (`RUN_STUB_ONLY`).
- Mainnet pillars + planning metrics are wired in Prometheus but **no real L1 is touched**.

**Guarantees:**

- No mainnet state changes.
- We can rehearse the entire bootstrap like a stage play:
  - Keys pillar green (roles mapping vs live JSON).
  - PLAN pillar green.
  - Dev bootstrap honored (VoidMainnetBootstrapDev).
  - All `ops/void-mainnet-*` hammers green.

**Exit criteria to leave Phase 0:**

- `void:mainnet_pillars:health_with_keys:last_5m == 1` (or whatever we lock as “pillars+keys OK”).
- Bootstrap ceremony runbook is stable and tagged.
- Governance model + validators & rewards docs exist and match the live JSON.

We are basically **here already**.

---

## Phase 1 – Solo Validator Mainnet (validator0 only)

This is the “we go live even if no one else is ready” phase.

**State:**

- A real L1 mainnet exists for chainId **2050**.
- `VoidMainnetBootstrapMainnet` gets a **real** `runReal(configPath)` path (future work) that:
  - Loads secrets (keys) from LUKS / hardware.
  - Calls `vm.startBroadcast(deployerKey)`.
  - Executes the real bootstrap wiring.
  - Stops broadcast and verifies core invariants.
- `validator0` is the **only active validator** in `ValidatorSet`.

**Who is validator0?**

- Defined in `config/void-mainnet-bootstrap-mainnet.live.json` under `.validator0`.
- Has:
  - `reward` address (validator reward address).
  - `consensusKey` (consensus-layer key).
  - `stakeVOID > 0`.
- Funded entirely out of `VoidTreasury` according to the tokenomics + bootstrap docs.

**Promises / non-promises in Phase 1:**

- We **do not** pretend this is a decentralized validator set.
- We **do** promise:
  - To run the network reasonably and not intentionally wreck state.
  - To respect the published tokenomics (no surprise mints).
  - To treat this as the canonical VOID chain for chainId 2050.
- Anyone can:
  - Run a full node.
  - Build wallets / apps on top.
  - Store data and run agents as if this is the “real VOID”.

**Why this is acceptable:**

- It avoids waiting on “human coordination” to launch.
- It’s honest about centralization at genesis.
- It gives us a real chain to build on while we recruit additional validators at our pace.

**Exit criteria to leave Phase 1:**

- At least one additional validator candidate is fully prepared:
  - Keys and stake path defined.
  - Governance / AdminGate / UpdateGate approvals ready.
- The process to add validators is documented and rehearsed (ideally on devnet).

---

## Phase 2 – Curated Validator Set

This is the “we are no longer alone, but we are still picky” phase.

**State:**

- `ValidatorSet` contains **N >= 2** validators.
- Additional validators are added through a **curated process**:
  - We (or a small group of known operators) review and approve candidates.
  - Validators must meet minimum stake and basic operational standards.
- Governance is still tightly held:
  - AdminGate / UpdateGate / ConfigGate are controlled by a small, known signer set.
  - On-chain changes are gated by that set, not open voting.

**Promises / non-promises:**

- We **do not** promise fully permissionless validator onboarding yet.
- We **do** promise:
  - Multiple independent validators.
  - A clear, documented path for how a new validator gets in.
  - Transparent criteria for acceptance (stake, uptime expectations, basic infra competence).

**Exit criteria to leave Phase 2:**

- We have:
  - A robust validator onboarding flow (scripts + docs).
  - Enough production experience with multiple validators.
  - A concrete design for more open governance and validator access (slashing, penalties, etc.).

---

## Phase 3 – Open Validator Set (future)

This is the “permissionless staking” target.

**State:**

- `ValidatorSet` supports **public** onboarding based on clear, on-chain rules:
  - Minimum stake.
  - Slashing / penalties.
  - Misbehavior rules and off-chain evidence paths (if needed).
- Governance is more distributed:
  - AdminGate / UpdateGate roles expanded or partially handed to broader signer sets / DAOs.
  - On-chain configuration changes follow more transparent and higher-participation processes.

**Promises / non-promises:**

- We **do** aim for:
  - Clear, non-hand-wavey rules for becoming a validator.
  - Automatic enforcement of slashing / penalties where possible.
- We **do not** promise:
  - That everyone who wants to validate will automatically be accepted with dust-level stake.
  - That we will sacrifice security / chain health for “pure democracy”.

Phase 3 is where long-term emission policy, staking economics, and security tradeoffs become a community issue, not just a single-operator decision.

---

## How this ties back to the existing docs

- **Bootstrap ceremony** doc:
  - Describes the exact steps we take to go from Phase 0 → Phase 1
    (keys, PLAN, ceremony, broadcast, verification).

- **Governance model** doc:
  - Defines who is allowed to change what during Phases 1–3.
  - Clarifies the role of AdminGate / UpdateGate / ConfigGate.

- **Validators & rewards** doc:
  - Defines who actually earns VOID and under what high-level rules.
  - Makes it clear that full nodes are important but not automatically paid by emissions.

This doc sits above all of that and says, in plain language:

> We are allowed to go live as a single validator if the pillars + keys + PLAN are green.  
> We grow the validator set in phases, and we don’t pretend we’re fully decentralized before we are.
