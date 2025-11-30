# VOID Mainnet Bootstrap PLAN (live) — README

This README documents how to treat the *live* mainnet bootstrap PLAN config.

- Live PLAN file (never committed):
  - config/void-mainnet-bootstrap-mainnet.live.json

That JSON will eventually hold the **real** VOID mainnet bootstrap wiring:

- Roles:
  - deployer, treasuryAdmin, opsTreasuryAdmin, validatorAdmin
  - adminGateOwner, updateGateOwner, configGateOwner
  - treasuryOwner, opsTreasuryOwner, rewardEngineOwner, validatorSetOwner
- Contracts:
  - updateGate, adminGate, configGate, validatorSet
  - voidToken, premineVault, treasury, voidTreasury, opsTreasury, rewardEngine
- Validator 0:
  - reward address
  - consensusKey
  - stakeVOID

## Do NOT commit the live PLAN JSON

The file:

- MUST NOT be added to Git.
- Is allowed to contain real **addresses** and stake amounts.
- MUST NOT contain seeds, mnemonics, or private keys.

We already guard it via .gitignore:

- config/void-mainnet-bootstrap-mainnet.live.json

Treat the live PLAN JSON as coming from your **sentinel / LUKS device** and offline notes, not from this repo.

## Read-only health / readiness checks

From the repo root:

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-readiness.sh

That script does, in summary:

1. Checks mainnet core / lastmile / safeboot health via Prometheus:
   - void:mainnet_overall:health:last_5m_v2
   - void:mainnet_pillars:health:last_5m
   - void:mainnet_lastmile:health:last_5m
   - void_safeboot_overall_health

2. Checks the bootstrap PLAN health:
   - void:mainnet_bootstrap_plan:configured:last_5m
   - void:mainnet_bootstrap_plan:health:last_5m

3. Shows a summary like:

   - CONFIG_OK=1, STRUCT_OK=0 → PLAN is configured but NOT READY
   - CONFIG_OK=1, STRUCT_OK=1 → PLAN is configured and structurally READY

Right now, by design:

- Mainnet pillars are green.
- PLAN is "configured but NOT READY":
  - void:mainnet_bootstrap_plan:configured:last_5m = 1
  - void:mainnet_bootstrap_plan:health:last_5m     = 0

We only flip PLAN health to 1 when:

- Real roles, contracts, and validator0 are filled into the live JSON (from the sentinel plan).
- The rehearsal script reports planReady = true.
- We are actually preparing to talk to *real* VOID mainnet.

## High-level live PLAN workflow (later, with real keys/devices)

1. Prepare real addresses and validator stake **offline** (sentinel / hardware + paper).
2. Generate config/void-mainnet-bootstrap-mainnet.live.json from that offline source.
3. Run:

       cd ~/dev/void-node
       ./ops/void-mainnet-bootstrap-plan-all.sh
       ./ops/void-mainnet-bootstrap-readiness.sh

4. Confirm:
   - Pillars remain healthy.
   - PLAN moves to STRUCT_OK=1 and planReady=true.

5. Only after that do we design and run the real mainnet broadcast script.

This README is documentation only and must never contain private keys, seeds, or mnemonics.
