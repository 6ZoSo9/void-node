# VOID Mainnet — Bootstrap PLAN Health Spec

This document defines how the bootstrap PLAN health metrics should work.
The goal is to prevent treating a dummy or half-configured PLAN as "ready"
for mainnet.

## 1. Inputs

The exporter uses three main inputs:

1) Live config file

- Path: config/void-mainnet-bootstrap-mainnet.live.json
- Optional override: CONFIG_PATH
- Used to decide:
  - Does the file exist?
  - Is it valid JSON?

2) Structural checklist

- Script: ops/void-mainnet-bootstrap-plan-checklist2.sh
- Internally calls:

  a) ops/void-mainnet-bootstrap-plan-checklist.sh

  - Checks:
    - chainId == 2050
    - Non-zero roles:
      - deployer
      - treasuryAdmin
      - opsTreasuryAdmin
      - validatorAdmin
    - Non-zero contract addresses:
      - updateGate
      - adminGate
      - configGate
      - validatorSet
      - voidToken
      - premineVault
      - treasury / voidTreasury
      - opsTreasury
      - rewardEngine
    - Validator0:
      - reward (non-zero EOA)
      - consensusKey (non-zero public key)
      - stakeVOID (fixed to 1,000,000 VOID)

  - Emits a local summary:
    - plan_structural_health = 1 if all critical fields are non-zero
    - plan_structural_health = 0 otherwise

  b) ops/void-mainnet-bootstrap-plan-placeholder-check.sh

  - Fails if the live config contains obvious placeholders such as:
    - ADDRESS_HARDWARE_
    - TODO_SET_
    - VALIDATOR0_CONSENSUS_KEY

3) PLAN simulation (future)

- Script: ops/void-mainnet-bootstrap-plan-sim.sh (or similar)
- Runs the mainnet bootstrap script in a PLAN / rehearsal mode against a local RPC.
- Verifies that, given the current live JSON:
  - Contracts deploy and wire correctly.
  - Tokenomics invariants hold (premine, treasury, ops treasury, etc.).
  - Validator set is initialized correctly (validator0 stake, keys, etc.).

## 2. Metrics

The exporter should expose at least these gauges:

1) void_mainnet_bootstrap_plan_configured

- Type: gauge
- Meaning:
  - 0 = live config missing or unreadable
  - 1 = live config exists and parses as JSON

2) void_mainnet_bootstrap_plan_structural_health

- Type: gauge
- Inputs:
  - plan_structural_health from ops/void-mainnet-bootstrap-plan-checklist.sh
  - Exit code from ops/void-mainnet-bootstrap-plan-placeholder-check.sh
- Meaning:
  - 1 if:
    - plan_structural_health == 1
    - placeholder check exit code == 0
  - 0 otherwise

3) void_mainnet_bootstrap_plan_sim_ok (future)

- Type: gauge
- Meaning:
  - 1 = PLAN simulation completed successfully for the current config
  - 0 = sim failed, not run, or stale

4) void_mainnet_bootstrap_plan_health

- Type: gauge
- This is the gate metric.
- Target behavior:
  - Set to 1 only if all of the following are true:
    - void_mainnet_bootstrap_plan_configured == 1
    - void_mainnet_bootstrap_plan_structural_health == 1
    - void_mainnet_bootstrap_plan_sim_ok == 1 (once wired)
  - Otherwise set to 0.

Right now, during development, this metric should remain 0 because:
- Roles are still dummy/zero.
- Contract addresses are zero.
- Validator0 reward and consensusKey are zero.
- PLAN sim is not wired yet.
This is correct and must not be overridden.

## 3. Prometheus rules (conceptual)

Recording rule:

- Name: void:mainnet_bootstrap_plan:health:last_5m
- Definition: 5-minute average of void_mainnet_bootstrap_plan_health.

Alert (conceptual):

- Name: VoidMainnetBootstrapPlanUnhealthy
- Condition: void:mainnet_bootstrap_plan:health:last_5m == 0 for 10 minutes.
- Meaning: live config missing, structurally invalid, or sim/checklist failing.
- Runbook:
  - Check config/void-mainnet-bootstrap-mainnet.live.json
  - Run ops/void-mainnet-bootstrap-plan-checklist2.sh
  - Run PLAN sim script once it exists.

## 4. Lifecycle phases

Phase 1: Early development (current)

- Live config exists but contains dummy/zero values.
- Checklist reports plan_structural_health = 0.
- Placeholder check passes (no TODO_SET_ etc.).
- PLAN sim not wired or failing.

Expected metrics:
- void_mainnet_bootstrap_plan_configured = 1
- void_mainnet_bootstrap_plan_structural_health = 0
- void_mainnet_bootstrap_plan_sim_ok = 0 (or missing)
- void_mainnet_bootstrap_plan_health = 0

Phase 2: Pre-mainnet rehearsal

Steps:

1) Fill real values via env + generator:
   - config/void-mainnet-plan.env (local only, not committed)
   - ops/void-mainnet-bootstrap-live-from-env.sh → writes live JSON.

2) Run ops/void-mainnet-bootstrap-plan-checklist2.sh until:
   - Roles are non-zero and match docs/void-mainnet-roles-plan.md.
   - Core contract addresses are non-zero and match rehearsal outputs.
   - Validator0:
     - reward = HARDWARE_VALIDATOR_1 address
     - consensusKey = VALIDATOR0_CONSENSUS_KEY public key
     - stakeVOID = "1000000"
   - Placeholder check is clean.

3) Run PLAN sim with this config and ensure success.

Then exporter should set:
- void_mainnet_bootstrap_plan_configured = 1
- void_mainnet_bootstrap_plan_structural_health = 1
- void_mainnet_bootstrap_plan_sim_ok = 1
- void_mainnet_bootstrap_plan_health = 1

Phase 3: Live mainnet

- Any change to roles, contracts, or validator0 fields must:
  - Go through checklist2.
  - Go through PLAN sim.
- Only after both succeed should plan_health return to 1.
- Alerts fire if plan health stays 0 for a sustained period.

## 5. Non-goals

The PLAN health gate does not validate the entire chain state.

It only asserts that:
- The bootstrap PLAN config exists and is valid JSON.
- Critical roles, contract addresses, and validator0 fields are non-zero and
  free of placeholder markers.
- A bootstrap PLAN simulation has passed against this config (once wired).

This is enough to prevent:
- Launching mainnet with zero or placeholder addresses.
- Forgetting validator0 wiring.
- Skipping a full rehearsal of the bootstrap script.
