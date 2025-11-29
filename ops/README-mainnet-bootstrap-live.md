# VOID Mainnet Bootstrap — LIVE Runbook (High-Level)

This doc describes the **LIVE bootstrap path** for VOID mainnet.

It is **not** executable code. It is a **checklist + mental model** that sits
on top of the existing PLAN instrumentation.

We deliberately keep the **PLAN phase at `plan_health = 0`** until:

- Real mainnet keys exist (on LUKS / hardware, per keys plan)
- Real addresses are chosen and filled into the `.live.json` config
- Dry-run rehearsals on anvil have succeeded end-to-end

Only after that do we move to an actual LIVE broadcast.

---

## 0. Current state (PLAN lane)

Right now, on branch `feat/mainnet-core-20251120`, we have:

- Config:
  - `config/void-mainnet-bootstrap-mainnet.live.json` (PLAN config, all zeros/TODO)
- Scripts:
  - `ops/void-mainnet-bootstrap-plan-status.sh` (JSON ZERO vs SET + gauges)
  - `ops/void-mainnet-bootstrap-plan-view.sh` (Forge view, no broadcast)
  - `ops/void-mainnet-bootstrap-plan-rehearse.sh` (Forge rehearsal, no broadcast)
  - `ops/void-mainnet-bootstrap-plan-exporter.sh` (metrics file writer)
  - `ops/void-mainnet-bootstrap-plan-health-all.sh` (CONFIG_OK / STRUCT_OK)
  - `ops/void-mainnet-bootstrap-plan-prom-health.sh` (Prom recordings sanity)
  - `ops/void-mainnet-bootstrap-plan-all.sh` (all-in-one PLAN harness)
- Prometheus:
  - Textfile metric: `void_mainnet_bootstrap_plan.prom`
  - Recordings:
    - `void:mainnet_bootstrap_plan:configured:last_5m`
    - `void:mainnet_bootstrap_plan:health:last_5m`

The **expected** current readings:

- `CONFIG_OK = 1`
- `STRUCT_OK = 0`
- `plan_health = 0`
- STATUS / VIEW / REHEARSE all show **ZERO/TODO** for:
  - `roles.deployer`
  - `roles.treasuryAdmin`
  - `roles.opsTreasuryAdmin`
  - `roles.validatorAdmin`
  - `contracts.voidToken`
  - `contracts.premineVault`
  - `contracts.treasury`
  - `contracts.voidTreasury`
  - `contracts.opsTreasury`
  - `contracts.rewardEngine`
  - `validator0.reward`
  - `validator0.consensusKey`
  - `validator0.stakeVOID` (TODO string)

This is by design.

---

## 1. Phases overview

We split bootstrap into **five** conceptual phases:

1. **PLAN** (where we are now)
2. **PREP** (keys + addresses)
3. **DRY-RUN** (anvil rehearsal with real-looking data, still safe)
4. **LIVE** (real mainnet broadcast)
5. **POST-BOOT CHECKS** (prom / on-chain sanity after genesis wiring)

This README only describes the **shape** of these phases and what must be true
before advancing. The actual LIVE scripts will be written later.

---

## 2. PLAN → PREP (keys and roles)

### 2.1 Keys (offline, per keys plan)

Before touching `.live.json` with real addresses, we must have:

- Fresh, never-used keys for:
  - Premine / `VoidTreasury` path
  - `AdminGate` master key
  - `UpdateGate` signer set
- Stored on:
  - LUKS-encrypted USB(s)
  - And/or hardware wallets
- Devnet keys **must not** be reused for mainnet.

All of that stays **off-repo**. This README does not contain any secrets.

### 2.2 Roles mapping (conceptual)

We need a clear mapping from **real identities** to:

- `roles.deployer`
- `roles.treasuryAdmin`
- `roles.opsTreasuryAdmin`
- `roles.validatorAdmin`
- `roles.adminGateOwner`
- `roles.updateGateOwner`
- `roles.configGateOwner`
- `roles.treasuryOwner`
- `roles.opsTreasuryOwner`
- `roles.rewardEngineOwner`
- `roles.validatorSetOwner`

Some of these will be EOAs, some will eventually be multi-sig contracts, and
some may be the same logical actor in early mainnet.

The important rule: the mapping is **written down outside the repo** and is
backed by the keys storage plan (LUKS / hardware).

---

## 3. PREP → DRY-RUN (fill config with real values)

In the PREP phase we will:

1. Copy the current `.live.json` to a secure, local path (still not committed).
2. Replace all ZERO/TODO values with **real addresses / parameters**, including:
   - All `roles.*` fields
   - All `contracts.*` fields
   - `validator0.reward`
   - `validator0.consensusKey`
   - `validator0.stakeVOID` (real numeric amount, respecting tokenomics)
3. Run PLAN checks locally with the new config:
   - `./ops/void-mainnet-bootstrap-plan-all.sh`

In a **ready** config, the eventual target is:

- `CONFIG_OK = 1`
- `STRUCT_OK = 1`
- `plan_health = 1` (once we consciously decide it is ready)

For now, while we are still designing, we keep `plan_health = 0`.

---

## 4. DRY-RUN phase (anvil, with real-like config)

Later, we will introduce **DRY-RUN scripts** (names TBD) that:

- Spin up a local anvil chain with `chainId = 2050`.
- Use the same `.live.json` (with real-like addresses) to:
  - Simulate the full bootstrap sequence:
    - Deploy gates
    - Deploy token / treasury / reward engine / validator set
    - Wire premine into the contract-based `VoidTreasury`
    - Wire OpsTreasury and initial validator stake
  - Print a **human-readable plan** of each step and each address.
- Revert or run in an ephemeral test chain to ensure **no real mainnet impact**.

The DRY-RUN success criteria:

- All steps execute without revert.
- All role / contract / wiring invariants match the tokenomics + governance plan.
- Post-run Prometheus checks (dedicated DRY-RUN metrics) are green.

---

## 5. LIVE phase (real broadcast)

Only after DRY-RUN passes repeatedly, and the keys / addresses have been
double-checked against offline documentation, do we move into the **LIVE**
phase.

The LIVE phase will eventually consist of:

- One or more **bootstrap scripts** (names TBD) that:
  - Read the same `.live.json`.
  - Use Foundry’s `--broadcast` mode against a real VOID mainnet RPC URL.
  - Log a complete, reproducible transcript of:
    - Each deployment
    - Each transaction hash
    - Each final contract address
- Post-run exporting of:
  - A finalized “bootstrap manifest” (JSON)
  - A human-readable bootstrap report (Markdown / text)

None of this exists yet; this README is the design anchor.

---

## 6. POST-BOOT CHECKS

After LIVE bootstrap, we will:

1. Run a dedicated **post-boot health harness** (future `ops/void-mainnet-bootstrap-live-health.sh` or similar) that checks:
   - AdminGate / UpdateGate / ConfigGate wiring
   - VoidToken total supply vs tokenomics
   - Treasury / OpsTreasury / RewardEngine balances
   - ValidatorSet initial set and stakes
2. Ensure Prometheus **mainnet pillars** and **bootstrap-live** metrics are all:
   - `overall = 1`
   - Any “bootstrap mismatch” counters are 0.

At that point, bootstrap is considered **locked-in**, and core updates flow
through `UpdateGate` only.

---

## 7. How this README is meant to be used

- **Now**: as a reminder of the phases and invariants while we are still in
  PLAN mode with `plan_health = 0`.
- **Later**: as the top-level doc we tighten when:
  - We finalize script names for DRY-RUN and LIVE.
  - We hook in Prometheus metrics and alerts for the LIVE bootstrap path.
  - We prepare the real `.live.json` with actual addresses and stakes.

This file must never contain:
- Private keys
- Mnemonics
- Seed phrases
- Raw LUKS image paths
- Any unredacted secrets

It is safe to commit to the repo as part of the long-term mainnet runbooks.
