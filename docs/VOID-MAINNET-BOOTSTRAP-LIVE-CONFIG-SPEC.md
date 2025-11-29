# VOID Mainnet Bootstrap Live Config Spec

This document defines the shape and rules for:

  config/void-mainnet-bootstrap-mainnet.live.json

This file is the **real** mainnet bootstrap config used by:

  script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet

and by the PLAN-only script:

  ops/void-mainnet-bootstrap-mainnet-plan.sh

The `.live.json` file is:

- **Git-ignored** (never committed)
- Stored on an encrypted volume (LUKS / hardware)
- The single source of truth for:
  - premine destinations
  - Treasury / Ops Treasury wiring
  - UpdateGate / AdminGate / ConfigGate ownership
  - ValidatorSet initial members and stakes


## 1. File location and lifecycle

Path:

  config/void-mainnet-bootstrap-mainnet.live.json

Properties:

- Must exist **only** on the machine(s) used to PLAN and later BROADCAST
  the real mainnet bootstrap.
- Must never be committed to git (guarded already by .gitignore).
- Must be treated as a long-lived secret config:
  - backed up under encryption,
  - rotated only via an explicit process,
  - changes always verified via PLAN simulation before any broadcast.

The PLAN script:

  ops/void-mainnet-bootstrap-mainnet-plan.sh

reads this file, runs a dry-run `forge script` simulation, and writes a
Prometheus textfile that drives:

  - void_mainnet_bootstrap_plan_ready
  - void:mainnet_bootstrap_plan:ready:last_5m


## 2. High level structure

The live config follows the same shape as the dev template, but with
**real** addresses and values instead of placeholders.

Conceptual structure:

  {
    "network": "void-mainnet",
    "chainId": 2050,

    "rpc": {
      "forkUrl": "https://<your-mainnet-fork-node>"
    },

    "roles": {
      "deployer":           "0xDEAD...",
      "treasuryAdmin":      "0x....",
      "opsTreasuryAdmin":   "0x....",
      "validatorAdmin":     "0x....",
      "adminGateOwner":     "0x....",
      "updateGateOwner":    "0x....",
      "configGateOwner":    "0x....",
      "treasuryOwner":      "0x....",
      "opsTreasuryOwner":   "0x....",
      "rewardEngineOwner":  "0x....",
      "validatorSetOwner":  "0x...."
    },

    "contracts": {
      "updateGate":    "0x0000000000000000000000000000000000000000",
      "adminGate":     "0x0000000000000000000000000000000000000000",
      "configGate":    "0x0000000000000000000000000000000000000000",
      "validatorSet":  "0x0000000000000000000000000000000000000000",
      "voidToken":     "0x0000000000000000000000000000000000000000",
      "voidTreasury":  "0x0000000000000000000000000000000000000000",
      "opsTreasury":   "0x0000000000000000000000000000000000000000",
      "rewardEngine":  "0x0000000000000000000000000000000000000000"
    },

    "premine": {
      "total": "666666666000000000000000000",   // MAX_SUPPLY
      "treasury": "333333333000000000000000000",
      "emissions": {
        "era1": "177777777000000000000000000",
        "era2": "88888889000000000000000000",
        "era3": "44444444000000000000000000",
        "era4": "22222223000000000000000000"
      }
    },

    "validators": [
      {
        "name":        "validator-0",
        "reward":      "0x....",  // reward address (EOA or smart wallet)
        "consensusKey": "0x....", // bytes32 or compressed key
        "stakeVOID":   "TODO"     // string in VOID (human-readable), see section 4
      }
    ]
  }

Notes:

- `contracts.*` may be zero addresses for the **first** broadcast if the
  script is responsible for deploying them, or pre-filled if the script
  is wiring an already-deployed set.
- For the current stub, all `contracts.*` are zero and the script
  reverts after printing a summary. For real mainnet, we will replace
  the revert with real deployments/wiring, and `PLAN_OK` must reflect that.


## 3. Roles section

The `roles` object defines which real-world keys control which pieces of
the system. Each value MUST be a **checksummed** Ethereum address.

Required:

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

Invariants:

- `roles.deployer` is the account that sends the bootstrap transaction.
  This can be:
  - a hardware wallet,
  - a local key on an air-gapped box,
  but **must not** be a hot key reused elsewhere.
- Owner roles (`*Owner`, `*Admin`) must follow the key plan:
  - some may be multi-sig,
  - some may be time-locked or behind UpdateGate,
  but the config only sees the **front** address.
- `validatorAdmin` and `validatorSetOwner` must be wired so that:
  - ValidatorSet is controlled only via the locked governance path
    (AdminGate + UpdateGate), not by a random EOA.


## 4. Premine and emissions

The `premine` section encodes the locked tokenomics:

- MAX_SUPPLY = 666,666,666 VOID
- PREMINE   = 333,333,333 VOID (VoidTreasury at genesis)
- EMISSIONS = 333,333,333 VOID over 100 years in 4 eras

Fields:

- premine.total — MUST equal MAX_SUPPLY in wei.
- premine.treasury — MUST equal the PREMINE amount in wei that ends up
  in VoidTreasury after bootstrap.
- premine.emissions — MUST match the 4-era split, in wei.

The PLAN script should:

- Parse and compare these values against the on-chain constants in
  the core token contracts.
- Fail PLAN (PLAN_OK=0) if any mismatch is found.


## 5. Validators section

The `validators` array defines the **initial** ValidatorSet entries.

Each entry:

  {
    "name":         "validator-0",
    "reward":       "0x....",
    "consensusKey": "0x....",
    "stakeVOID":    "1234567.89"
  }

Fields:

- name: free-form label used in logs and docs.
- reward: the address that receives rewards (can be a different wallet
  from the consensus key).
- consensusKey: bytes32 or compressed key material as expected by
  ValidatorSet.
- stakeVOID: human-readable string representing the VOID to bond.

Rules for `stakeVOID`:

- It is expressed in VOID, not wei.
- The PLAN script is responsible for converting this to wei and
  validating:
  - total initial stake <= premine.treasury,
  - per-validator minimums (TBD),
  - any diversity rules we choose.

PLAN MUST fail (PLAN_OK=0) if:

- any `reward` or `consensusKey` is zero,
- any `stakeVOID` is missing or unparsable,
- sum(stakes) violates tokenomics invariants.


## 6. RPC / fork URL

The `rpc.forkUrl` field is used **only** for simulation:

  "rpc": {
    "forkUrl": "https://<your-mainnet-fork-node>"
  }

Rules:

- In the **dev** phase, this may be omitted, and the PLAN script will
  log:

    [warn] MAINNET_FORK_URL not set; skipping forge simulation.
    [warn] PLAN is NOT ready (no fork URL).

  and export PLAN_OK=0 (stub state).

- For real mainnet PLAN readiness:
  - forkUrl MUST be set,
  - forge simulation MUST succeed,
  - and the script MUST export PLAN_OK=1
    *only if* all checks pass.


## 7. PLAN_OK and Prometheus metrics

The PLAN script writes a textfile, e.g.:

  ops/out/void-mainnet-bootstrap-plan.prom

containing at least:

  void_mainnet_bootstrap_plan_ready 0|1
  void_mainnet_bootstrap_plan_chainid 2050
  void_mainnet_bootstrap_plan_validators <n>
  void_mainnet_bootstrap_plan_config_sha256 "<hex>"

From this, Prometheus derives:

  - void_mainnet_bootstrap_plan_ready
  - void:mainnet_bootstrap_plan:ready:last_5m

Interpretation:

- PLAN_OK == 0:
  - stub phase,
  - or missing forkUrl,
  - or simulation failed,
  - or config/tokenomics/validators invalid.

- PLAN_OK == 1:
  - forkUrl set and reachable,
  - script ran without revert,
  - tokenomics invariants hold,
  - validator config valid,
  - contracts/roles layout consistent.

The alert:

  VoidMainnetBootstrapPlanNotReady

is expected to fire (info) while PLAN_OK==0 in the stub phase.  
Once we approach real mainnet, we flip PLAN_OK to 1 and treat this alert
as a real warning.


## 8. Editing and review process

Edits to:

  config/void-mainnet-bootstrap-mainnet.live.json

MUST follow this process:

1) The file lives on an encrypted volume only.
2) Any change is accompanied by:
   - git-tagged docs updates (not the .live.json),
   - a fresh PLAN simulation:

       ./ops/void-mainnet-bootstrap-mainnet-plan.sh \
         config/void-mainnet-bootstrap-mainnet.live.json

   - exporter run (if needed) to refresh metrics.
3) We check:

   - void_mainnet_bootstrap_plan_ready
   - void:mainnet_bootstrap_plan:ready:last_5m

4) Only when PLAN_OK==1 and all mainnet pillars are green do we proceed
   to design the BROADCAST flow (separate runbook).

This spec is the contract that the `.live.json` file must obey before we
ever touch real VOID mainnet.
