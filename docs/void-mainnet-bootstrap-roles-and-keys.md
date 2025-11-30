# VOID Mainnet Bootstrap — Roles and Keys

This document defines the **canonical roles and keys** used during the VOID mainnet bootstrap.

It is the source of truth for:

- Which addresses appear in `config/void-mainnet-bootstrap-mainnet.live.json`
- Where the corresponding keys live (hardware wallet, LUKS USB, etc.)
- Which scripts and metrics depend on them.

Note: This file is about **MAINNET** keys only. Devnet / anvil keys are separate and must never be reused for mainnet.

---

## 1. Roles in `void-mainnet-bootstrap-mainnet.live.json`

The live mainnet config has a `roles` section of this shape (example only):

    {
      "roles": {
        "deployer":        "0x0000000000000000000000000000000000000000",
        "treasuryAdmin":   "0x0000000000000000000000000000000000000000",
        "opsTreasury":     "0x0000000000000000000000000000000000000000",
        "updateGateAdmin": "0x0000000000000000000000000000000000000000",
        "configGateAdmin": "0x0000000000000000000000000000000000000000",
        "rewardAdmin":     "0x0000000000000000000000000000000000000000"
      },
      ...
    }

These fields are the **only EOAs** allowed to do dangerous things during bootstrap.

Role meanings and high-level policy:

- `deployer`  
  - EOA that actually sends the bootstrap transactions and deploys contracts.  
  - Storage: hardware wallet (cold) + LUKS backup.  
  - Usage: very rare after bootstrap.

- `treasuryAdmin`  
  - Governs `VoidTreasury` (premine, long-term emission control).  
  - Storage: hardware wallet; must not be the same key as `deployer`.  
  - Usage: very infrequent, with a formal process.

- `opsTreasury`  
  - Ops / runway wallet receiving controlled flows from Treasury.  
  - Storage: hardware wallet or hardened hot wallet with strict discipline.  
  - Usage: regular but governed by written policy (budget approvals, etc.).

- `updateGateAdmin`  
  - Admin for `UpdateGate` (code upgrades, v99 rules, etc.).  
  - Storage: hardware wallet, extremely protected.  
  - Usage: only for well-documented, multi-party approved upgrades.

- `configGateAdmin`  
  - Admin for configuration parameters (non-code tuning knobs).  
  - Storage: hardware wallet; can be distinct from `updateGateAdmin`.  
  - Usage: rare but more acceptable than code upgrades (still gated).

- `rewardAdmin`  
  - Admin for `RewardEngine` parameters and reward schedules.  
  - Storage: hardware wallet or LUKS-backed key.  
  - Usage: occasional when tuning incentives.

Conceptual invariants:

- All role addresses must be:
  - Non-zero (`!= 0x0000...0000`).  
  - Valid 20-byte EVM addresses.

- Roles must not all collapse to a single key. At minimum:
  - `deployer` != `treasuryAdmin`  
  - `deployer` != `opsTreasury`  
  - `updateGateAdmin` and `configGateAdmin` should not be casual hot keys.

The PLAN sim script (`./ops/void-mainnet-bootstrap-plan-sim.sh`) enforces some of these invariants and drives the PLAN metrics:

- `void_mainnet_bootstrap_plan_health`
- `void_mainnet_bootstrap_plan_health_info{reason="..."}`
- `void:mainnet_bootstrap_plan:health:last_5m`

---

## 2. Validator bootstrap key (`validator0`)

The live config will also define a bootstrap validator, simplified as:

    {
      "validator0": {
        "address":       "0x0000000000000000000000000000000000000000",
        "consensusKey":  "0x0000000000000000000000000000000000000000",
        "rewardAddress": "0x0000000000000000000000000000000000000000"
      }
    }

Intent:

- `validator0.address`  
  - First validator that starts the chain.  
  - Key must not be a random hot key; treat with similar care as admin keys while still allowing liveness.

- `validator0.consensusKey`  
  - If separated from `address`, this is the key used in consensus.  
  - Policy can mirror `validator0.address` or use an internal validator key scheme.

- `validator0.rewardAddress`  
  - Where block rewards and emissions flow.  
  - Typically a treasury / ops-controlled address (for example, `VoidTreasury` or `opsTreasury` path), not a private personal wallet.

PLAN sim expectations (conceptual):

- `validator0.address` is non-zero and valid.  
- `validator0.rewardAddress` is non-zero and consistent with treasury / ops policy.  
- Optional checks that `rewardAddress` belongs to an allowed set derived from Treasury/Ops roles.

---

## 3. Premine, Treasury, Ops flow (tokenomics alignment)

VOID mainnet tokenomics (locked):

- `MAX_SUPPLY = 666,666,666 VOID`
- `PREMINE   = 333,333,333 VOID` (genesis treasury)
- `EMISSIONS = 333,333,333 VOID` over 100 years in four eras.

Bootstrap rules:

- Premine is held by `VoidTreasury` at genesis.  
- `treasuryAdmin` controls `VoidTreasury`.  
- `opsTreasury` receives controlled flows from `VoidTreasury` (for example, periodic budgets).  
- `rewardAdmin` manages `RewardEngine` parameters but cannot bypass `VoidTreasury`.

Long-term critical keys:

- Treasury admin key (`treasuryAdmin`).  
- Ops treasury key (`opsTreasury`).  
- Reward admin key (`rewardAdmin`).  
- UpdateGate and ConfigGate admin keys.  
- Validator0 key(s).

Backups and storage:

- Each of these must have:
  - At least one hardware-wallet representation where possible.  
  - A LUKS-encrypted backup (for example, USB) stored physically separate.  
  - A written retrieval and usage procedure (who, when, how).

Details of the exact backup and ceremony live in the separate keys plan document (not this file).

---

## 4. PLAN metrics and their relation to this doc

Exporter + sim + Prometheus give the following signals:

- `void_mainnet_bootstrap_plan_configured`  
  - Equals 1 if the live config JSON exists and parses structurally.

- `void_mainnet_bootstrap_plan_health`  
  - Equals 1 only when all required roles and fields pass the PLAN sim invariants (roles, validator0, premine mapping, etc.).

- `void_mainnet_bootstrap_plan_health_info{reason="<string>"}`  
  - Gives the failure reason; examples:
    - `bad_roles`
    - `bad_validator0`
    - `bad_premine`
    - `ok`

- `void:mainnet_bootstrap_plan:health:last_5m`  
  - A 5-minute smoothed view from a recording rule, used for:
    - Mainnet health gates (for example, `./ops/void-mainnet-health-all.sh`).  
    - Alerts (`VoidMainnetBootstrapPlanNotReady`).

Current expected behavior (before real keys exist):

- `void_mainnet_bootstrap_plan_health = 0`  
- `void_mainnet_bootstrap_plan_health_info{reason="bad_roles"} = 1`  
- `void:mainnet_bootstrap_plan:health:last_5m = 0`

This is intentional. PLAN must remain red until real mainnet addresses and keys have been generated and filled in.

---

## 5. When we are actually close to mainnet

When preparing for real mainnet launch:

1. Generate **fresh, never-used mainnet keys** for each role:
   - `deployer`
   - `treasuryAdmin`
   - `opsTreasury`
   - `updateGateAdmin`
   - `configGateAdmin`
   - `rewardAdmin`
   - `validator0` (and optionally a separate consensus key)

2. Store them according to the keys plan:
   - Hardware wallets for all feasible roles.  
   - LUKS-encrypted USB backups.  
   - Documented procedures for use and recovery.

3. Fill `config/void-mainnet-bootstrap-mainnet.live.json` with the final addresses, matching the role matrix described here.

4. Run the PLAN tools:

       cd "$HOME/dev/void-node"
       ./ops/void-mainnet-bootstrap-plan-sim.sh
       ./ops/void-mainnet-bootstrap-plan-health-all.sh
       ./ops/void-mainnet-bootstrap-plan-status.sh
       ./ops/void-mainnet-health-all.sh

5. Only when:

   - `void_mainnet_bootstrap_plan_health = 1`  
   - `void:mainnet_bootstrap_plan:health:last_5m = 1`  
   - All mainnet pillars and safeboot metrics are green

   do we proceed to the PLAN-only mainnet bootstrap rehearsal and, later, the real broadcast.

