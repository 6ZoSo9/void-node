# VOID Mainnet Bootstrap PLAN – Live Config

This file describes how the live PLAN config for VOID mainnet is handled.

It is tied to:

- ops/README-mainnet-plan-roles-and-keys.md
- ops/README-mainnet-keys-and-devices.md
- config/void-mainnet-bootstrap-mainnet.live.json
- PLAN health tooling:
  - ops/void-mainnet-bootstrap-plan-all.sh
  - ops/void-mainnet-bootstrap-readiness.sh
  - Prometheus metrics void_mainnet_bootstrap_plan_*

Hard rule: any *.live.json mainnet config must never be committed or pushed. These files live on the LUKS sentinel device and offline backups, not in Git.

---

## 1. Live PLAN JSON overview

Live PLAN JSON path:

- config/void-mainnet-bootstrap-mainnet.live.json

Key fields that must be set for a real mainnet PLAN:

- chainId = 2050
- roles.deployer
- roles.treasuryAdmin
- roles.opsTreasuryAdmin
- roles.validatorAdmin
- roles.adminGateOwner
- roles.updateGateOwner
- roles.configGateOwner
- roles.treasuryOwner
- roles.opsTreasuryOwner
- roles.rewardEngineOwner
- roles.validatorSetOwner

Contracts section:

- contracts.updateGate
- contracts.adminGate
- contracts.configGate
- contracts.validatorSet
- contracts.voidToken
- contracts.premineVault
- contracts.treasury
- contracts.voidTreasury
- contracts.opsTreasury
- contracts.rewardEngine

Validator 0 section:

- validator0.reward
- validator0.consensusKey
- validator0.stakeVOID (for example "1000000e18")

The PLAN is considered structurally ready only when all of these are non-zero and correctly filled.

---

## 2. PLAN tooling

Main PLAN check:

- Script: ops/void-mainnet-bootstrap-plan-all.sh

This script:

- Shows ZERO vs SET for roles, contracts and validator0 from the live config.
- Runs a Forge rehearsal (no broadcast).
- Refreshes the PLAN textfile metrics:
  - ops/metrics/void_mainnet_bootstrap_plan.prom
- Prints CONFIG_OK and STRUCT_OK summary flags.

Meaning:

- CONFIG_OK = 1 means the JSON is structurally valid.
- STRUCT_OK = 1 means critical roles, contracts and validator0 are all filled.
- void_mainnet_bootstrap_plan_health is derived from these flags.

---

## 3. Readiness hammer

Readiness snapshot script:

- ops/void-mainnet-bootstrap-readiness.sh

It reports:

- Mainnet overall health
- Mainnet pillars and lastmile
- Safeboot overall health
- PLAN metrics from Prometheus:
  - void:mainnet_bootstrap_plan:configured:last_5m
  - void:mainnet_bootstrap_plan:health:last_5m
- Presence of the three key docs:
  - ops/README-mainnet-bootstrap-plan-live.md
  - ops/README-mainnet-plan-roles-and-keys.md
  - ops/README-mainnet-keys-and-devices.md

Current expected state:

- Mainnet pillars and lastmile should be 1.
- PLAN configured should be 1.
- PLAN health should remain 0 until real addresses are decided and written into the live JSON.

---

## 4. Relationship to roles and devices

ops/README-mainnet-plan-roles-and-keys.md:

- Describes which roles and owners exist and how they relate to AdminGate, UpdateGate, ConfigGate, ValidatorSet, Treasury and RewardEngine.

ops/README-mainnet-keys-and-devices.md:

- Describes which devices hold which keys (LUKS sentinel, hardware wallets, paper backups, etc).

ops/README-mainnet-bootstrap-plan-live.md (this file):

- Describes how those decisions are encoded into the live PLAN JSON and how we check readiness.

Whenever roles, owners or device assignments change, all three must be kept in sync and the PLAN rehearsal must still pass.

---

## 5. Prometheus gating

Prometheus uses the following for gating:

- void:mainnet_bootstrap_plan:configured:last_5m
- void:mainnet_bootstrap_plan:health:last_5m

These are fed by:

- ops/void-mainnet-bootstrap-plan-all.sh
- ops/metrics/void_mainnet_bootstrap_plan.prom (textfile exporter)

For now:

- configured = 1 and health = 0 means:
  - The PLAN JSON is structurally sane.
  - Critical fields are still placeholders and must not be used for a real mainnet launch.

Before actual mainnet bootstrap:

- configured must be 1.
- health must move to 1.
- All other mainnet pillars and lastmile checks must stay green.
