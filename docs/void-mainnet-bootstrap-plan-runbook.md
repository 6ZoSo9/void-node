# VOID Mainnet Bootstrap — PLAN RUNBOOK (PLAN-only, no broadcast)

**Status:** PLAN lane wired and monitored — no real mainnet deployments yet.  
**Date:** 2025-11-28 checkpoint.

This runbook describes how to:

- Keep the VOID mainnet bootstrap PLAN config in sync.
- Verify PLAN health via Prometheus.
- Run PLAN-only dry-runs and forge simulations that **never broadcast**.

A separate, heavily audited **broadcast runbook** will be created later.  
Nothing here should ever send real transactions.

---

## 0. Preconditions

Before touching the PLAN lane:

1. Core health is green:

   - Devnet overall OK.
   - Mainnet-core OK.
   - Safeboot OK.
   - Manifest days OK (currently 365).

2. Last-mile is healthy:

   - Non-empty blocks.
   - txroot/header3/seals sane for mainnet-core.

3. PLAN lane is structurally wired:

   - PLAN config file exists on disk.
   - Exporter is exposing PLAN metrics.
   - Prometheus is scraping and recording PLAN health.

Quick one-shot check:

    ./ops/void-mainnet-health-all.sh

Expected behavior:

- void:mainnet_overall:health:last_5m_v2         = 1 (informational)
- void:mainnet_pillars:health:last_5m            = 1
- void:mainnet_lastmile:health:last_5m           = 1
- void_safeboot_overall_health                   = 1
- void:mainnet_bootstrap_plan:health:last_5m     = 1

The gate in void-mainnet-health-all.sh enforces:

- pillars 5m == 1
- lastmile 5m == 1
- bootstrap PLAN 5m == 1

If any of these are 0, **do not proceed** with PLAN edits until fixed.

---

## 1. PLAN config file

The main PLAN config for real mainnet is:

- config/void-mainnet-bootstrap-mainnet.live.json

Properties:

- Contains chainId (must be 2050 for VOID mainnet).
- Contains roles, contracts, and validator0 fields for bootstrap planning.
- Is **never committed** (guarded by .gitignore).
- Must live on encrypted storage when holding real addresses or keys.

Typical lifecycle:

1. Mount encrypted medium (for example, a LUKS-encrypted USB).
2. Copy or edit config/void-mainnet-bootstrap-mainnet.live.json locally.
3. Run PLAN scripts and health checks.
4. Sync any finalized version back to encrypted storage.
5. Optionally delete the working copy from the local disk when done.

---

## 2. PLAN scripts overview

These scripts operate on the *.live.json file and do **not** broadcast.

All assume:

- REPO_ROOT = \$HOME/dev/void-node (by default).
- RPC_URL   = http://127.0.0.1:8545 (anvil-2050 or real mainnet endpoint later).

### 2.1 Checklist (local structural scan)

    ./ops/void-mainnet-bootstrap-plan-checklist.sh

Reads the PLAN config and prints:

- chainId (config) vs chainId (RPC).
- Roles view: deployer, treasuryAdmin, opsTreasuryAdmin, validatorAdmin, adminGateOwner, updateGateOwner, configGateOwner, treasuryOwner, opsTreasuryOwner, rewardEngineOwner, validatorSetOwner.
- Contracts view: updateGate, adminGate, configGate, validatorSet, voidToken, premineVault, treasury, voidTreasury, opsTreasury, rewardEngine.
- Validator0 view: reward, consensusKey, stakeVOID.

Also computes a local plan_structural_health flag (1 or 0) based on missing or zero CRITICAL fields.

This is **local advisory** only; the Prometheus exporter is the canonical gate.

### 2.2 PLAN structural view (pretty printer)

    ./ops/void-mainnet-bootstrap-plan-view.sh

Pretty-prints the same roles, contracts, and validator0 sections and then summarizes:

- PLAN_STATUS : READY or NOT_READY.
- DETAILS with missing contracts and validator fields.

Use this when editing the live.json file to see exactly what is still missing.

### 2.3 PLAN PromQL health hammer

    ./ops/void-mainnet-bootstrap-plan-all.sh

Runs, in order:

- void-mainnet-bootstrap-plan-checklist.sh
- void-mainnet-bootstrap-plan-view.sh
- void-mainnet-bootstrap-plan-health-all.sh
- void-mainnet-bootstrap-mainnet-plan-sim.sh (forge stub sim)

PromQL portion checks:

- void:mainnet_bootstrap_plan:health:last_5m

Current semantics:

- plan_health == 1 means:
  - Exporter sees a structurally coherent PLAN config.
  - PLAN lane is wired and monitored.
- Local checklist may still report NOT_READY due to placeholder addresses; this is acceptable for the current PLAN-ready stage.

### 2.4 PLAN dry-run runner (human view, jq-safe)

    ./ops/void-mainnet-bootstrap-plan-run.sh

Behavior:

- Prints a basic config view: chainId.
- Prints roles block with `<missing>` for unset fields.
- Prints contracts block with `<missing>` for unset fields.
- Prints validator0 block with `<missing>` for unset fields.
- Prints a conceptual sequence of bootstrap steps (pre-flight, gates, treasury/token, validator set, post-bootstrap invariants).

Guarantees:

- PLAN-only, does **not** broadcast.
- Safe to run repeatedly while iterating on live.json (as long as secrets hygiene is respected).

### 2.5 Forge PLAN simulation (stub, no deployments)

    ./ops/void-mainnet-bootstrap-mainnet-plan-sim.sh

This wraps:

- script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet

and calls the run(configPath) function against the PLAN config.

Expected behavior at this stage:

- Script parses the JSON via vm.readFile and vm.parseJson*.
- Logs roles, contracts, and validator0.
- Reverts with:

    "VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast"

This confirms that:

- Solidity side can see the PLAN config.
- No real deployments occur (stub only).
- The control flow is wired for a future, real broadcast implementation.

---

## 3. Standard PLAN workflow (2025-11-28)

This is the current recommended loop when adjusting or reviewing the PLAN config.

### Step 0 — Ensure RPC and Prometheus are up

- Anvil-2050 or the relevant RPC for chainId 2050 is running at:
  
      http://127.0.0.1:8545

- Prometheus is up and scraping:

  - Node exporter (9100).
  - VOID node exporters (mainnet-core, safeboot, etc.).
  - Bootstrap PLAN exporter.

### Step 1 — Health gate (global)

Run:

    ./ops/void-mainnet-health-all.sh

Only proceed if:

- void:mainnet_pillars:health:last_5m        = 1
- void:mainnet_lastmile:health:last_5m       = 1
- void:mainnet_bootstrap_plan:health:last_5m = 1

If any of these are 0, **stop** and fix the underlying pillar or PLAN exporter first.

### Step 2 — Inspect the PLAN config (local)

Run:

    ./ops/void-mainnet-bootstrap-plan-checklist.sh

and:

    ./ops/void-mainnet-bootstrap-plan-view.sh

Use the output to:

- Confirm chainId is 2050.
- See which roles, contracts, and validator fields are still placeholders.
- Decide what needs to be edited in config/void-mainnet-bootstrap-mainnet.live.json.

### Step 3 — Human-readable PLAN dry-run

Run:

    ./ops/void-mainnet-bootstrap-plan-run.sh

Use this when you want a compact, human summary of:

- The config view (roles, contracts, validator0).
- The conceptual bootstrap sequence the real broadcast script will eventually follow.

This is the main entry point for humans reading the PLAN.

### Step 4 — Forge simulation sanity check

Run:

    ./ops/void-mainnet-bootstrap-plan-all.sh

This will:

- Re-run checklist and view.
- Check PLAN PromQL health.
- Run the forge script simulation (stub) and ensure it sees the config.

You should see:

- plan_health OK in the PromQL part.
- A stub revert message in the forge part, confirming that we have not yet implemented or enabled real broadcast.

---

## 4. What is **not** implemented yet (future work)

This runbook deliberately stops at the PLAN stage.

Not implemented yet:

1. Real on-chain deployments to live VOID mainnet.
2. A signed, audited broadcast script that:
   - Reads *.live.json.
   - Prints a detailed transaction plan (who signs what, in which order).
   - Gathers hardware-wallet approvals.
   - Sends transactions with explicit confirmations.

3. Metrics and alerts specifically for:
   - "Bootstrap broadcast plan ready."
   - "Bootstrap broadcast executed."
   - Drift between PLAN config and on-chain reality.

These will be covered in a separate:

- docs/void-mainnet-bootstrap-broadcast-runbook.md
- ops/void-mainnet-bootstrap-mainnet-broadcast.sh (or similar)

and will only be written once PLAN + keys + governance review are fully locked.

---

## 5. Snapshot of this checkpoint

At this 2025-11-28 checkpoint:

- All mainnet pillars are green.
- Safeboot overall health is 1.
- Last-mile health is 1.
- Bootstrap PLAN exporter health is 1.
- The PLAN config still uses placeholder addresses for roles, contracts, and validator0.
- All bootstrap scripts here are PLAN-only and safe to run for rehearsal.

Treat this document as the human-facing guide for the PLAN lane.  
Do **not** treat it as authorization to perform live mainnet deployments.
