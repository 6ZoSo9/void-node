# VOID Mainnet Bootstrap – Operator Runbook (PLAN Phase)

Network: **VOID mainnet (chainId 2050)**  
Scope: How an operator goes from **“PLAN not ready”** to **“PLAN ready”**  
without broadcasting anything on live mainnet.

This runbook is about the **PLAN pillar only**:

- void_mainnet_bootstrap_plan_configured  
- void_mainnet_bootstrap_plan_health  
- void:mainnet_bootstrap_plan:health:last_5m

It assumes the rest of mainnet pillars (core, last-mile, safeboot, tokenomics) are already green.

---

## 0. Prereqs & sanity

Before doing anything with the PLAN:

1. Repo + branch

   - Repo: ~/dev/void-node  
   - Branch: feat/mainnet-core-20251120 (or whatever future mainnet branch replaces it)

   Command:

   - cd "$HOME/dev/void-node"  
   - git status

   Make sure working tree is clean or intentionally dirty for docs only.

2. Pillars must be green

   Command:

   - ./ops/void-mainnet-health-all.sh

   Expect:

   - void:mainnet_overall:health:last_5m_v2 = 1  
   - void:mainnet_pillars:health:last_5m = 1  
   - void:mainnet_lastmile:health:last_5m = 1

3. PLAN should be configured but NOT_READY

   Commands:

   - ./ops/void-mainnet-bootstrap-plan-status.sh  
   - ./ops/void-mainnet-bootstrap-plan-summary.sh

   Expect:

   - void_mainnet_bootstrap_plan_configured = 1  
   - void_mainnet_bootstrap_plan_health     = 0  
   - void:mainnet_bootstrap_plan:health:last_5m = 0  
   - Summary shows missing roles/contracts and/or validator fields.

At this stage we are safe: PLAN is wired but red, and nothing is pointed at real mainnet keys yet.

---

## 1. Read the designs (do not skip)

There are three core docs:

1. Keys blueprint

   - docs/void-mainnet-keys-blueprint.md  
   - Describes the logical roles: deployer, gates, treasuries, validator0, etc.

2. Custody & roles plan

   - docs/void-mainnet-custody-plan-v0.md  
   - Maps each role to a type of key / multisig, for example:
     - CORE_COUNCIL_MSIG (3-of-5)  
     - TREASURY_COUNCIL_MSIG (3-of-5)  
     - OPS_MSIG (2-of-3)  
     - VAL0_REWARD, VAL0_CONSENSUS  
     - DEPLOYER_MAINNET

3. Bootstrap PLAN docs

   - docs/void-mainnet-bootstrap-plan.md  
   - docs/void-mainnet-bootstrap-roles-and-keys.md (when present)

Before changing anything, the operator must understand:

- Which human(s) hold which hardware wallets.  
- Which multisigs are supposed to exist.  
- Which addresses will go into the .live.json and which must never be committed.

---

## 2. PLAN JSON: live vs template

Files involved:

- Template (safe to commit):

  - config/void-mainnet-bootstrap-mainnet.template.json

- Live PLAN (never commit):

  - config/void-mainnet-bootstrap-mainnet.live.json  
  - This file is git-ignored and must only exist on the operator’s machine.

The .live.json is what feeds:

- VoidMainnetBootstrapMainnet.plan(string configPath)  
- ops/void-mainnet-bootstrap-plan-sim.sh  
- ops/void-mainnet-bootstrap-plan-rehearsal.sh  
- ops/void-mainnet-bootstrap-plan-health-all.sh

The operator is responsible for keeping .live.json in sync with:

- The current custody design.  
- The actual deployed multisigs and contracts when the time comes.

---

## 3. PLAN helpers (what they do)

### 3.1 PLAN smoke (Solidity-level parse/log)

Command:

- ./ops/void-mainnet-bootstrap-mainnet-plan-smoke.sh

Behavior:

- Calls VoidMainnetBootstrapMainnet.plan(configPath) against the configured RPC.  
- Reads .live.json via Foundry cheatcodes.  
- Logs out roles.*, contracts.*, validator0.*  

No broadcasts, no state changes. Pure planning/logging.

Use this to confirm “what the script thinks the plan is”.

---

### 3.2 PLAN sim (invariant check, no RPC)

Command:

- ./ops/void-mainnet-bootstrap-plan-sim.sh

Behavior:

- Reads .live.json locally.  
- Checks invariants, currently:
  - chainId == 2050  
  - Required roles non-zero.  
  - Required contracts non-zero.  
  - Required validator0 fields present.

It fails with reasons like:

- bad_roles  
- bad_contracts

Until we fill real addresses, this will fail and is the reason for plan_health = 0.

---

### 3.3 PLAN rehearsal (RPC + checklist + sim)

Command:

- ./ops/void-mainnet-bootstrap-plan-rehearsal.sh

Behavior:

- Sanity checks RPC chainId (e.g. anvil-2050 vs real mainnet).  
- Runs PLAN summary.  
- Runs bootstrap-plan-checklist.  
- Runs PLAN sim and reports combined result.

During early stages, rehearsal is expected to print:

- checklist_ok = 1 (once JSON is structurally sound)  
- sim_ok       = 0 (until real addresses are provided)

---

### 3.4 PLAN health (exporter + checklist gate)

Command:

- ./ops/void-mainnet-bootstrap-plan-health-all.sh

Behavior:

- Queries Prometheus for:
  - void_mainnet_bootstrap_plan_configured  
  - void_mainnet_bootstrap_plan_health  
  - void:mainnet_bootstrap_plan:health:last_5m
- Runs bootstrap-plan-checklist.  
- Summarizes as:
  - RESULT: NOT_OK while PLAN is not ready.  
  - RESULT: OK once exporter and checklist agree.

This is what feeds the PLAN pillar in overall mainnet health.

---

## 4. Phases to go from NOT_READY to READY

The operator must follow these phases in order.

### Phase A – Key ceremony (off-chain)

Goal: The right hardware wallets exist, but nothing is written into .live.json yet.

High-level steps:

1. Create or confirm:

   - CORE council hardware wallets: CORE_1 … CORE_5  
   - TREASURY council hardware wallets: TREASURY_1 … TREASURY_5  
   - OPS hardware wallets: OPS_1 … OPS_3  
   - Deployer hardware wallet: DEPLOYER_MAINNET  
   - Validator0 reward wallet: VAL0_REWARD  
   - Validator0 consensus key: VAL0_CONSENSUS (node key)

2. Backups and safety:

   - Each council member holds their seed securely (paper or device backup).  
   - No seeds on disk. No seeds in git. No seeds in /tmp.

At the end of Phase A, you know which human holds which key, but no on-chain moves have been made.

---

### Phase B – Deploy multisigs (rehearsal on anvil)

Goal: On anvil-2050, prove that the multisig layout is sane.

Steps:

1. Bring up anvil devnet (chainId 2050) as described in dev bootstrap docs.

2. Use dev bootstrap scripts to:

   - Deploy CORE_COUNCIL_MSIG (3-of-5).  
   - Deploy TREASURY_COUNCIL_MSIG (3-of-5).  
   - Deploy OPS_MSIG (2-of-3).

3. Record the dev addresses in a local scratch file (not committed) and verify:

   - Thresholds are correct.  
   - Owners match expected CORE_*, TREASURY_*, OPS_* keys.

This rehearsal proves the pattern but does not determine mainnet addresses.  
Mainnet addresses will be different, but the procedure will be the same.

---

### Phase C – Deploy core contracts (rehearsal on anvil)

Goal: On anvil-2050, prove that the bootstrap script can wire everything correctly.

High-level steps:

1. Use the dev bootstrap harness (void-mainnet-dev-bootstrap-full.sh and related scripts) to:

   - Deploy UpdateGate, AdminGate, ConfigGate, ValidatorSet, VoidToken, premine vault, VoidTreasury, OpsTreasury, RewardEngine.  
   - Wire ownership:
     - Gates and ValidatorSet → CORE_COUNCIL_MSIG.  
     - VoidTreasury and premine vault → TREASURY_COUNCIL_MSIG.  
     - OpsTreasury and RewardEngine → OPS_MSIG.
   - Move premine into VoidTreasury.  
   - Run a validator0 claim flow (Treasury → Ops → Reward → validator claim).

2. Confirm on devnet that:

   - Tokenomics invariants hold.  
   - Reward flow works.  
   - Governance and ownership layout matches the custody plan.

Only after this rehearsal is green do we consider burning real gas on L1.

---

### Phase D – Fill .live.json for real (no broadcasts yet)

Goal: On the operator machine, fill live JSON with real mainnet addresses.

This phase happens later, when:

- Mainnet is deployed with chainId 2050.  
- Multisigs and core contracts have been deployed on that chain using real hardware wallets.  
- Contract addresses are known and stable.

Steps:

1. Start from template (never commit the live file):

   - cd "$HOME/dev/void-node"  
   - cp config/void-mainnet-bootstrap-mainnet.template.json \
        config/void-mainnet-bootstrap-mainnet.live.json

2. Fill roles.* with real addresses:

   - deployer = DEPLOYER_MAINNET  
   - treasuryAdmin, treasuryOwner = TREASURY_COUNCIL_MSIG  
   - opsTreasuryAdmin, opsTreasuryOwner, rewardEngineOwner = OPS_MSIG  
   - adminGateOwner, updateGateOwner, configGateOwner, validatorAdmin, validatorSetOwner = CORE_COUNCIL_MSIG

3. Fill contracts.* with real deployed addresses:

   - updateGate, adminGate, configGate, validatorSet  
   - voidToken, premineVault, treasury, voidTreasury  
   - opsTreasury, rewardEngine

4. Fill validator0.*:

   - reward = VAL0_REWARD (EOA)  
   - consensusKey = VAL0_CONSENSUS (bytes32 encoding used by ValidatorSet)  
   - stakeVOID = agreed stake amount (for example 1000000)

5. Verify by PLAN smoke:

   - ./ops/void-mainnet-bootstrap-mainnet-plan-smoke.sh

Check that:

- All critical roles are non-zero.  
- All critical contracts are non-zero.  
- Validator0 reward and consensusKey are present and correct.

---

### Phase E – Drive PLAN health to 1 (still no broadcast)

With .live.json filled correctly:

1. PLAN sim

   - ./ops/void-mainnet-bootstrap-plan-sim.sh

   Expect:

   - No ERROR lines about missing roles, contracts, or validator fields.  
   - RESULT indicates READY (or equivalent success state).

2. PLAN rehearsal

   - ./ops/void-mainnet-bootstrap-plan-rehearsal.sh

   Expect:

   - checklist_ok = 1  
   - sim_ok       = 1  
   - No red warnings about critical fields.

3. PLAN health

   - ./ops/void-mainnet-bootstrap-plan-health-all.sh

   Expect:

   - void_mainnet_bootstrap_plan_configured = 1  
   - void_mainnet_bootstrap_plan_health     = 1  
   - void:mainnet_bootstrap_plan:health:last_5m = 1 after a short delay

At that point the PLAN pillar flips from NOT_READY to READY and no longer drags mainnet-health-all down.

We still will not have broadcast the actual bootstrap script on mainnet; that is a separate, stricter runbook.

---

## 5. Out of scope for this runbook

This document does not cover:

- The actual live bootstrap broadcast (calling VoidMainnetBootstrapMainnet.run on real mainnet).  
- Any post-genesis changes via UpdateGate, AdminGate, or ConfigGate.  
- Detailed physical key-ceremony procedures (room, USB layout, human process).

Those will live in separate docs, for example:

- docs/void-mainnet-bootstrap-live-runbook.md (future)  
- docs/void-mainnet-governance-ops.md (future)

This document’s job:

- Make sure the operator understands the PLAN design.  
- Make sure they can fill .live.json safely with real addresses.  
- Make sure they can drive plan_health from 0 to 1 without touching live state.
