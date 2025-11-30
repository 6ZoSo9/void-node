# VOID Mainnet — LIVE Bootstrap Runbook (SKELETON, DO NOT USE YET)

> STATUS: SKELETON ONLY — this file is an outline.
> It is **not** a complete or approved procedure for broadcasting the VOID mainnet bootstrap.
> Do **NOT** run live mainnet actions based solely on this doc.

This runbook will eventually describe the **actual, irreversible** VOID mainnet bootstrap:

- Deploying core contracts (VoidToken, VoidTreasury, OpsTreasury, RewardEngine, AdminGate, ConfigGate, UpdateGate, ValidatorSet, etc.).
- Moving the premine into the Treasury and Ops paths.
- Wiring validator set + reward engine.
- Emitting any required receipts / events for observability.

Right now it is just a structured outline to be filled in **after**:

- PLAN pillar is green.
- Hardware-wallet keys are finalized and stored according to the keys plan.
- We deliberately decide on a launch window.

----------------------------------------------------------------------
0. Scope, Warnings, and Assumptions
----------------------------------------------------------------------

- This runbook is for **real VOID mainnet** (chainId 2050), not devnet or anvil.
- All actions here are **one-way** once broadcast.
- All signers are assumed to be **hardware wallets or equivalent HSM**, never hot keys.
- No .live.json, mnemonics, seeds, or key material should ever be committed to git.

**Hard rules:**

1. Do not run any "LIVE" step unless:
   - PLAN runbook is fully satisfied.
   - void:mainnet_bootstrap_plan:health:last_5m == 1
   - void:mainnet_overall:health:last_5m_v2 == 1
   - void:mainnet_pillars:health:last_5m == 1

2. Do not modify this file to add ad-hoc shortcuts; treat it as a controlled change:
   - Changes must be reviewed and tagged as checkpoints (ckpt-mainnet-boot-...).

----------------------------------------------------------------------
1. Preconditions Checklist (to be enforced)
----------------------------------------------------------------------

This section will be expanded into a strict checklist. For now, we record the items:

- [ ] PLAN pillar:
  - [ ] config/void-mainnet-bootstrap-mainnet.live.json exists only locally.
  - [ ] ./ops/void-mainnet-bootstrap-plan-roles-dump.sh shows status=ok for all core roles.
  - [ ] ./ops/void-mainnet-bootstrap-plan-sim.sh exits with code 0.
  - [ ] ./ops/void-mainnet-bootstrap-plan-all.sh shows RESULT: OK (PLAN pillar GREEN).
  - [ ] Prometheus:
    - [ ] void_mainnet_bootstrap_plan_health = 1
    - [ ] void:mainnet_bootstrap_plan:health:last_5m = 1

- [ ] Mainnet pillars:
  - [ ] ./ops/void-mainnet-health-all.sh shows RESULT: OK.
  - [ ] void:mainnet_overall:health:last_5m_v2 = 1
  - [ ] void:mainnet_pillars:health:last_5m = 1
  - [ ] void:mainnet_lastmile:health:last_5m = 1
  - [ ] void_safeboot_overall_health = 1

- [ ] Keys & roles:
  - [ ] Roles in .live.json exactly match the keys plan doc:
        docs/void-mainnet-bootstrap-roles-and-keys.md
  - [ ] Premine / Treasury / Ops key handling matches:
        docs/VOID-MAINNET-KEYS-AND-TREASURY-PLAN.md
  - [ ] Hardware wallets have been tested on devnet/anvil with dry-run scripts.

- [ ] Observability:
  - [ ] All relevant VOID exporters are green (txroot, header3, seals, lastmile, pillars, plan).
  - [ ] Prometheus + Grafana dashboards for mainnet bootstrap are present and show no red flags.

----------------------------------------------------------------------
2. Dry-Run / Simulation Phase (Anvil + Dev Scripts)
----------------------------------------------------------------------

**Goal:** rehearse the exact sequence of actions against a local anvil chain (chainId 2050),
using the same config JSON shape as mainnet, **without** touching real mainnet.

This phase is already partly covered by:

- script/VoidMainnetBootstrapDev.s.sol
- ops/void-mainnet-dev-bootstrap-full.sh
- PLAN scripts (plan-sim, plan-all, roles-dump, etc.)

***TODO:*** When this runbook is promoted from SKELETON to LIVE:

- [ ] Document the exact commands to:
  - Start an anvil chain with chainId 2050.
  - Run the dev bootstrap script end-to-end.
  - Verify tokenomics invariants and role wiring.
  - Export a “dev rehearsal report” (JSON + text).

----------------------------------------------------------------------
3. Live Bootstrap Overview (High-Level, No Commands Yet)
----------------------------------------------------------------------

This section will eventually be the **heart** of the runbook.
For now, we only outline the phases:

1. **Freeze & Gate**
   - Lock deploy branch.
   - Ensure CI + pillars + plan gates are all green.
   - Take Prometheus + git snapshots.

2. **Pre-Broadcast Sanity**
   - Re-verify roles/keys against .live.json and the keys plan.
   - Re-run PLAN and mainnet-health scripts.
   - Confirm exporters show expected “pre-bootstrap” state.

3. **Broadcast Phase**
   - Use a dedicated script (e.g. ops/void-mainnet-bootstrap-mainnet-live.sh) that:
     - Reads the .live.json.
     - Performs each deployment / call in a deterministic order.
     - Logs tx hashes, gas, and events.
   - All signing done via hardware wallets / remote signers.

4. **Post-Broadcast Verification**
   - Check contract addresses vs expected ones.
   - Run tokenomics + validator + rewards invariant checks.
   - Confirm Prometheus exporters switch to “post-bootstrap” state
     (e.g. new gauges for “bootstrap_done = 1”).

5. **Unfreeze**
   - Once invariants + exporters + dashboards are clean for a grace window,
     allow normal mainnet activity (validators, wallets, NullFeed, etc.).

***TODO:*** Fill in each phase with **exact commands** and **expected outputs** once the
mainnet-live script and hardware signing flow are fully specified and tested.

----------------------------------------------------------------------
4. Observability and Rollback Strategy (Outline)
----------------------------------------------------------------------

Even though bootstrap is mostly one-way, we still need clear behavior:

- Before bootstrap:
  - bootstrap_done = 0
  - plan_health = 1
  - mainnet_overall_health = 1

- During bootstrap:
  - Temporary gauges / logs indicate “in progress”.
  - Alerts are suppressed or put in “maintenance” mode where appropriate.

- After bootstrap:
  - bootstrap_done = 1
  - All core health gauges remain 1.
  - Additional post-bootstrap invariants are enforced by alerts.

Rollback in case of failure:

- This will depend on the exact point of failure (early tx vs. deep into the sequence).
- At minimum we must document:
  - When to STOP and avoid “fixing” via ad-hoc txs.
  - How to capture full logs, snapshots, and forensic data.
  - Under what conditions a full chain restart / regenesis would be considered.

***TODO:*** Flesh this out when the bootstrap script and sequence are concrete.

----------------------------------------------------------------------
5. Change Control for This Runbook
----------------------------------------------------------------------

Because this file governs an extremely sensitive process:

- Every change to this runbook should:
  - Be committed with a clear message (e.g. "docs: refine mainnet LIVE bootstrap phase 2").
  - Be tagged with a checkpoint tag (e.g. ckpt-mainnet-bootstrap-live-doc-YYYYMMDD-HHMMSS).
- No one should run a LIVE bootstrap based on an unreviewed or untagged version.

Until then, treat this document as:

- A **skeleton outline**, not a procedure.
- A place to gradually accumulate detail as we converge on mainnet readiness.

