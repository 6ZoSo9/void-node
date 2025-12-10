# VOID Mainnet Roadmap — 2025-12-10 Snapshot

This document summarizes where VOID mainnet stands as of 2025-12-10, and what remains before we flip from “planning / rehearsal” into a real mainnet bootstrap.

It is meant to be the human-readable counterpart to all the Prometheus gauges, pillars, and tags.

---

## 1. Current Pillars & Health (high level)

These are the major health pillars and their status as of this snapshot:

- **Safeboot pillar**
  - `safeboot_overall = 1`
  - Safeboot node (4104) has a non-zero head and txroot/header3 exporters live.
  - Head is behind main but non-zero; treated as OK for now.

- **Devnet pillar**
  - `void_devnet_overall_health = 1`
  - Devnet jobs/receipts coverage gauges are green:
    - `void_devnet_coverage = 1`
    - `void_devnet_receipts_health_v2 = 1`
  - Agent/Model/Dataset registries all expose health=1.

- **Mainnet core pillar**
  - `void_mainnet_core_health = 1`
  - Manifest gauges:
    - `void_mainnet_core_manifest_health = 1`
    - `void_mainnet_core_manifest_days = 365`
    - `chosen_manifest_days = 365`
  - Safeboot is integrated into mainnet-core health (safeboot_overall = 1).

- **Mainnet last-mile pillar**
  - `void:mainnet_lastmile:health:last_5m = 1`
  - `void:mainnet_lastmile:last_nonempty_gap` small (e.g. ~4).
  - End-to-end path is confirmed:
    - `/tx/submit` → `Node.acceptTx` → `txQueue` → proposer → `SegStore.saveBlock` → txRoot
    - Persisted txs show up in `dev/blocks/:n/txs/persisted` and header3.txRoot matches dev txroot leaves.

- **Validators RUN pillar**
  - Validators RUN checks are wired:
    - `void_mainnet_validators_run_health`
    - `void:mainnet_validators:run:last_5m`
  - Composite health:
    - `void_mainnet_pillars_with_validators_health`
    - `void:mainnet_pillars_with_validators:health:last_5m`
  - These are integrated into pillars and pillars-preflight (validators are part of the gate now).

- **Keys / PLAN pillars**
  - **Keys pillar:**
    - `void_mainnet_keys_roles_ok = 1`
    - Roles mapping on LUKS voidkey matches `config/void-mainnet-bootstrap-mainnet.live.json`.
  - **Bootstrap PLAN pillar:**
    - `void_mainnet_bootstrap_plan_health = 1`
    - PLAN stub + live JSON are consistent and pass planning checks.
  - Composite pillars-with-keys gauge:
    - `void:mainnet_pillars_with_keys:health:last_5m = 1` (name may vary slightly, but concept is: pillars * keys * plan).

- **WorkCredits pillar (NEW)**
  - Mainnet WorkCredits pillar gauges:
    - `void_mainnet_workcredits_health = 1`
    - `void_mainnet_workcredits_plan_health = 1`
    - 5m view: `void:mainnet_workcredits:health:last_5m = 1`
  - Composite with validators + pillars:
    - `void:mainnet_pillars_with_validators_and_workcredits:health:last_5m = 1`
    - This is **dashboard-only** for now (non-gating).

---

## 2. WorkCredits Mainnet State (as of this snapshot)

### 2.1. Spec & config

- **Spec doc:** WorkCredits mainnet economics (seed, pool, flows) are documented in:
  - `docs/VOID-MAINNET-WORKCREDITS-SPEC.md` (spec name may vary, but exists).
- **Pillar doc:**
  - `docs/VOID-MAINNET-WORKCREDITS-PILLAR.md`
  - Defines basic rules:
    - `chainId = 2050`
    - `workCreditsToken` and `workCreditsPool` can be zero-address as “not wired yet”.
- **Live config JSON (stubbed addresses):**
  - `config/void-mainnet-workcredits.live.json`
  - Holds:
    - `chainId`
    - `workCreditsToken`
    - `workCreditsPool`
  - Currently uses **zero** addresses for token/pool on mainnet (no real WorkCredits mainnet deployment yet).

### 2.2. Exporters & health scripts

- **Exporters:**
  - `ops/void-mainnet-workcredits-exporter.sh`
    - Emits:
      - `void_mainnet_workcredits_health`
      - `void_mainnet_workcredits_info{mode="stub",reason="ok_stub",chainId="2050",token_zero="true",pool_zero="true"}`
  - `ops/void-mainnet-workcredits-plan-exporter.sh` (or similar name)
    - Emits:
      - `void_mainnet_workcredits_plan_health`
      - `void_mainnet_workcredits_plan_info{mode="stub",status="stub_ok"}`

- **Health-all wrapper:**
  - `ops/void-mainnet-workcredits-health-all.sh`
    - Runs exporter(s).
    - Queries Prometheus for:
      - `void_mainnet_workcredits_health`
      - `void_mainnet_workcredits_plan_health`
      - `void:mainnet_workcredits:health:last_5m`
    - Prints a summary and interpretation.

- **Dashboard helper:**
  - `ops/void-mainnet-workcredits-dashboard.sh`
    - Prints a dashboard-friendly snapshot:
      - Raw gauges.
      - 5m view.
      - Composite `void:mainnet_pillars_with_validators_and_workcredits:health:last_5m`.
    - Includes PromQL snippets for Grafana panels.

### 2.3. Prometheus rules

- **Recording rule:**
  - `void:mainnet_workcredits:health:last_5m`
    - 5m smoothed view of WorkCredits health.
- **Composite rule:**
  - `void:mainnet_pillars_with_validators_and_workcredits:health:last_5m`
    - Defined as:
      - `scalar(void:mainnet_pillars_with_validators:health:last_5m) * scalar(void:mainnet_workcredits:health:last_5m)`
    - Used for dashboards only, **not** for any gate yet.

---

## 3. Validator Incentives & WorkCredits (conceptual)

Validator incentives & WorkCredits are aligned but not fully wired for real mainnet yet.

### 3.1. Validators

- Core validator economics are implemented in Solidity and tested:
  - `VoidToken`, `VoidTreasury`, `OpsTreasury`, `RewardEngine`, `ValidatorSet` (L1 + mainnet), `JobQueue` and related contracts.
- We have:
  - A **Validator Incentives** doc:
    - Explains how VOID emissions + rewards flow to validators.
    - Covers base-era emissions and how RewardEngine distributes stakes/rewards over time.
- Validators RUN pillar ensures:
  - At least one validator “join + run” path is rehearsed and monitored.
  - RUN pillar is part of pillars-preflight gating.

### 3.2. WorkCredits & validators (future wiring)

- The current snapshot treats WorkCredits as a **meta pillar** for mainnet:
  - We prove we can monitor WorkCredits health, config, and plan separately.
- Later (post-mainnet or late pre-mainnet), we will:
  - Deploy a **real WorkCreditsToken** on mainnet.
  - Deploy a **WorkCreditsPoolV1** (WC/VOID AMM).
  - Seed the pool with the one-time VOID allocation (10M VOID) from the Treasury/Ops pool as per the spec.
  - Wire RewardEngine / agents so that meaningful node/agent work can earn WorkCredits.
  - Expose additional metrics:
    - WorkCredits supply.
    - WC/VOID pool reserves and prices.
    - WorkCredits earnings per validator / agent.

For now, we only ensure the **pillar and plan are monitored**, not that WorkCredits is live on mainnet.

---

## 4. What’s Left Before REAL Mainnet

This is the short list of things that must happen before a real public VOID mainnet launch. Some are already partially done; others are still “TODO”.

### 4.1. Bootstrap script: from STUB to real run()

- Current state:
  - `script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet` exists.
  - `run()` on mainnet is still **stub-only**:
    - Reverts with a sentinel (e.g. `RUN_STUB_ONLY`) in simulations.
  - `ops/void-mainnet-mainnet-health-all.sh` (or equivalent) runs:
    - Keys pillar.
    - PLAN pillar.
    - `run()` dry-run and expects the stub revert.
- TODO before real mainnet:
  1. Change `run()` from “stub only” to real deployment logic.
  2. Introduce a **hard gate** (sentinel file / env var) so real broadcasting cannot happen by accident.
  3. Run multiple rehearsals against an anvil chain with real, fresh mainnet keys (LUKS/hardware).
  4. Only when keys, PLAN, and rehearsals are all green, flip the sentinel from “no-broadcast” to “allow-broadcast” for the real run.

### 4.2. Final validator set and stake parameters

- Lock in:
  - Minimum validator stake.
  - Initial validator set addresses.
  - Any bootstrap overrides for the first era.
- Ensure:
  - Validators RUN pillar stays green with realistic stake values.
  - Docs clearly describe how new validators join and how they start earning VOID.

### 4.3. Last-mile soak & abuse scenarios

- We already have:
  - Non-empty block guarantees when txQueue has items.
  - txRoot correctness (header3.txRoot matches persisted tx leaves).
- Still needed:
  - Long soak runs (hours/days) under stress:
    - High tx rates.
    - Mixed job/receipt/agent traffic.
  - Vector 7 / DoS pressure scenarios:
    - Ensure memory and disk behavior is safe under sustained load.
  - Prometheus / Grafana:
    - Alerts when lastmile health degrades or when gap spikes.

### 4.4. Security & key ceremony

- Keys pillar is green, but we still need the **real** mainnet key ceremony:
  - Generate fresh, never-used mainnet keys for:
    - Premine / VoidTreasury.
    - AdminGate master key.
    - UpdateGate signer set.
    - ValidatorSet owner(s).
  - Store keys on LUKS-encrypted USB and/or hardware wallets.
  - Mirror the roles mapping into `/mnt/voidkey/meta/mainnet-roles-mapping.txt` and re-run keys-health.
- Write and follow a human-readable:
  - `docs/VOID-MAINNET-KEY-CEREMONY-RUNBOOK.md` (already partially done, but must be final).

### 4.5. WorkCredits real deployment (optional pre-launch, mandatory eventually)

- Optional before T=0, but mandatory for the long-term network:
  - Decide whether WorkCredits mainnet contracts are deployed at **genesis + bootstrap** or in a **post-launch upgrade**.
- If pre-launch:
  - Wire them into the main bootstrap script (alongside VoidToken/Treasury/RewardEngine/ValidatorSet).
- If post-launch:
  - Prepare a dedicated WorkCredits bootstrap script, plan JSON, and pillars/alerts specific to that rollout.

---

## 5. Post-Mainnet / Roadmap (not blocking launch)

These are features that do **not** block initial mainnet but are important for VOID’s long-term value.

### 5.1. Obelisk Wallet & NullFeed UI

- Obelisk Wallet tabs (baseline):
  - **Home:** summary, network health, last alerts.
  - **Wallet:** VOID/WC balances, send/receive, relayer on/off, “collect pending WC”.
  - **Trading View:** WC/VOID pool, price, basic buy/sell orders on the AMM.
  - **NullFeed:** chat UI (mIRC-style channels, join/create, admin tools).
  - **NFTs:** avatars and other assets when they’re ready.
  - **Dashboard:** node/network metrics, validator rewards, WorkCredits earnings.

- NullFeed design (off-chain first):
  - Encrypted chat across nodes with channel mapping on-chain.
  - Channel creators become admins; can set passwords, ban users, promote mods.
  - Later: per-channel customization (bots, images, etc.).

### 5.2. Website hosting on VOID nodes (on-chain mapping)

- Later phase:
  - Use smart contracts as a mapping layer from “URL-like identifiers” to content hashes / manifests.
  - Nodes serve websites off-chain (IPFS/S3/SegStore) while chain provides:
    - Mapping.
    - Integrity / provenance.
    - Optional access policy hooks.

### 5.3. Advanced AI features

- After mainnet, extend:
  - Agent marketplace.
  - Dataset / model registries with richer evaluators.
  - Encrypted vector search and JobQueue upgrades.
  - WC rewards for AI tasks, not just base validator work.

---

## 6. TL;DR — Where We Are vs What’s Left

**Now (this snapshot):**

- All core pillars are green:
  - Safeboot, devnet, mainnet-core, lastmile, validators RUN, keys, PLAN.
- WorkCredits:
  - Spec, pillar doc, plan doc, validator incentives doc, exporters, metrics, and dashboard helper are all in place.
  - WorkCredits health is monitored but **not gating**.
- Bootstrap:
  - Mainnet bootstrap script runs in **stub** mode only; PLAN and keys are locked and validated.

**Left before real mainnet launch:**

1. Turn the bootstrap script from stub to real, with a hard no-broadcast gate.
2. Finalize validator set and stake parameters.
3. Run extended last-mile soak + abuse tests and refine Vector 7 protections as needed.
4. Perform the real key ceremony with fresh mainnet keys on LUKS/hardware and re-validate keys pillar.
5. Decide when to deploy real WorkCredits mainnet contracts (pre-launch vs post-launch) and wire that into bootstrap/plan/pillars.

Everything else (Obelisk UI, NullFeed UI, website hosting, advanced AI markets) lives **after** mainnet and can be layered on once the chain is live and validators are earning.

