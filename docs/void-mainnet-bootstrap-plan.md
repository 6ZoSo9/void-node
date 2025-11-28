# VOID Mainnet Bootstrap PLAN

This doc describes the PLAN-only layer for VOID mainnet bootstrap. It does **not**
perform any on-chain deployments or broadcasts. It exists to answer, ahead of time:

- Which chain are we targeting?
- Which contracts/addresses will exist after bootstrap?
- Where does the premine go?
- How are AdminGate / UpdateGate / ValidatorSet / Treasury / OpsTreasury / RewardEngine wired?

The PLAN must go green **before** we ever attempt a real mainnet broadcast.

---

## 1. Config file: config/void-mainnet-bootstrap-mainnet.live.json

This file is live mainnet config and is already gitignored. It must be created
from the key ceremony (LUKS USB + hardware wallets).

Shape:

- Top-level:
  - chainId: 2050 (NUMBER, required)
  - addresses: OBJECT, required

- addresses fields (all required, non-zero addresses):
  - addresses.voidToken
  - addresses.voidTreasury
  - addresses.opsTreasury
  - addresses.adminGate
  - addresses.updateGate
  - addresses.validatorSet
  - addresses.rewardEngine

Example (JSON-ish):

    {
      "chainId": 2050,
      "addresses": {
        "voidToken":    "0x...",  // VOID ERC20 / mainnet token contract
        "voidTreasury": "0x...",  // VoidTreasury (premine target, contract-based)
        "opsTreasury":  "0x...",  // OpsTreasury (ops budgets)
        "adminGate":    "0x...",  // AdminGate master key entry point
        "updateGate":   "0x...",  // UpdateGate (M-of-N core upgrade gate)
        "validatorSet": "0x...",  // ValidatorSet for mainnet (initial validators)
        "rewardEngine": "0x..."   // RewardEngine (emissions + validator rewards)
      }
    }

Requirements:

- chainId must be 2050.
- All addresses.* must be present and non-zero (not empty, not null, not 0x0).

Anything else (premine splits, signer lists, etc.) lives inside the contracts
and the Forge bootstrap scripts, not in this JSON.

---

## 2. PLAN harness: ops/void-mainnet-bootstrap-mainnet-plan.sh

PLAN-only script, no broadcast.

Responsibilities:

- Read the config JSON (default: config/void-mainnet-bootstrap-mainnet.live.json).
- Verify:
  - chainId exists and equals 2050.
  - addresses.voidToken
  - addresses.voidTreasury
  - addresses.opsTreasury
  - addresses.adminGate
  - addresses.updateGate
  - addresses.validatorSet
  - addresses.rewardEngine
    are all present and non-zero.

- Write a textfile metric:

  - Path: ops/textfile/void_mainnet_bootstrap_plan.prom
  - Metrics:
    - void_mainnet_bootstrap_plan_ready {0|1}
    - void_mainnet_bootstrap_plan_chainid {N}

- Exit code:
  - 0 if all checks pass (PLAN_OK = 1).
  - 1 otherwise.

Example usage:

    ./ops/void-mainnet-bootstrap-mainnet-plan.sh \
      config/void-mainnet-bootstrap-mainnet.live.json

---

## 3. PLAN health hammer: ops/void-mainnet-bootstrap-mainnet-plan-health.sh

This script wraps the PLAN harness into a health check.

Behavior:

- Runs ops/void-mainnet-bootstrap-mainnet-plan.sh with the given config
  (default: config/void-mainnet-bootstrap-mainnet.live.json).
- Captures the exit code from the PLAN harness.
- Reads void_mainnet_bootstrap_plan_ready from
  ops/textfile/void_mainnet_bootstrap_plan.prom.
- Prints a summary.
- Exit rules:
  - GREEN only if:
    - PLAN exit code == 0, and
    - void_mainnet_bootstrap_plan_ready == 1.
  - Otherwise WARN and exit 1.

Example usage:

    ./ops/void-mainnet-bootstrap-mainnet-plan-health.sh

Current expected state (before real mainnet keys/addresses):

- void_mainnet_bootstrap_plan_ready = 0
- Plan health exit code = 1 (WARN; PLAN not ready).

---

## 4. Integration into mainnet health (soft for now)

ops/void-mainnet-health-all.sh includes a soft PLAN check:

- Calls ops/void-mainnet-bootstrap-mainnet-plan-health.sh.
- Logs its output.
- Currently ignores the non-zero exit code so that these remain the real gates:

  - void:mainnet_overall:health:last_5m_v2
  - void:mainnet_pillars:health:last_5m
  - void:mainnet_lastmile:health:last_5m
  - void_safeboot_overall_health

Later, once the real mainnet config exists and the PLAN is green, this can be
promoted to a hard gate (pillars + pre-push, plus Prometheus/alert wiring).

---

## 5. When is the PLAN considered "ready"?

PLAN is considered READY when all of the following are true:

1. config/void-mainnet-bootstrap-mainnet.live.json exists.
2. chainId == 2050.
3. addresses.{voidToken, voidTreasury, opsTreasury, adminGate, updateGate, validatorSet, rewardEngine}
   are all valid non-zero addresses derived from the mainnet key ceremony.
4. ./ops/void-mainnet-bootstrap-mainnet-plan-health.sh:
   - Exits with code 0.
   - Shows void_mainnet_bootstrap_plan_ready 1 in the metric file.

Only after PLAN is READY should we:

- Wire it as a hard gate in:
  - ops/void-mainnet-health-all.sh
  - pillars / pillars-preflight
  - pre-push for mainnet-critical branches.

- Add Prometheus scrape + recording rules + alerts for bootstrap-plan readiness.

- Consider moving from PLAN-only to any real broadcast path.

---

## 6. Relation to the stub bootstrap script

ops/void-mainnet-bootstrap-mainnet-stub-smoke.sh currently runs the Forge script
VoidMainnetBootstrapMainnet.s.sol in dry-run mode:

- Confirms that the runtime RPC chainId == 2050.
- Confirms that the config JSON chainId == 2050.
- Prints a banner and then reverts on purpose with:
  "stub only; implement real wiring before broadcast".

The stub is used to validate:

- Foundry/Forge toolchain.
- Script loading and config parsing.
- chainId sanity.

The PLAN layer (this doc) is orthogonal: it validates the intended wiring and
addresses independently of Forge. Both must be green before we design the real
mainnet bootstrap pipeline.
