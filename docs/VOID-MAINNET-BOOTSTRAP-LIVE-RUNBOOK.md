# VOID — Mainnet Bootstrap LIVE Runbook (DRAFT v0, DO NOT EXECUTE)

Status: DRAFT (structure only, NO live steps yet)  
Scope: This doc will eventually describe the **real** VOID mainnet bootstrap
(broadcasting transactions on the real network) using the locked PLAN and
hardware wallets.

**WARNING:**  
Until this document is explicitly promoted to v1 and reviewed, it is
**NOT** an instruction set. Treat it as a planning skeleton only.

---

## 0. Terminology

- **PLAN**: The locked configuration plus invariants for how mainnet should be
  wired (roles, premine, treasuries, gates, reward engine, validator set).
- **LIVE bootstrap**: The one-time sequence of on-chain transactions that turn
  the PLAN into reality on chainId 2050.
- **Safeboot**: Read-mostly lifeboat node that must be able to verify the
  outcome of the bootstrap independently.
- **Pillars**: Mainnet core, last-mile, safeboot, tokenomics, PLAN.

---

## 1. Preconditions (hard gates before LIVE)

The LIVE bootstrap must **not** be attempted unless ALL of the following are
true:

1. **PLAN pillar GREEN**

   - `./ops/void-mainnet-bootstrap-plan-all.sh` reports:

        [plan-all] RESULT: OK (PLAN pillar GREEN — sim invariants + health-all both passed)

   - Metrics:

        - `void_mainnet_bootstrap_plan_configured = 1`
        - `void_mainnet_bootstrap_plan_health = 1`
        - `void:mainnet_bootstrap_plan:health:last_5m = 1`

   - The PLAN config `config/void-mainnet-bootstrap-mainnet.live.json` is:

        - Stored only on secure machines.
        - Reviewed against `docs/void-mainnet-bootstrap-roles-and-keys.md`.
        - Matches the physical key/USB/LUKS plan.

2. **All non-PLAN pillars GREEN**

   - `./ops/void-mainnet-health-all.sh` returns overall OK when PLAN gating is
     enabled (i.e. it no longer fails on `plan_5m`):

        - `void:mainnet_overall:health:last_5m_v2 = 1`
        - `void:mainnet_pillars:health:last_5m = 1`
        - `void:mainnet_lastmile:health:last_5m = 1`
        - `void_safeboot_overall_health = 1`

3. **Core + contracts frozen**

   - The core node, consensus rules, and mainnet contracts (tokenomics,
     Treasury, RewardEngine, AdminGate, UpdateGate, ValidatorSet, JobQueue, etc.)
     are at a tagged, signed, documented release (e.g. `golden-mainnet-vX`).
   - Governance doc for v99 freeze + update policy exists and is approved.

4. **Keys plan finalized**

   - Premine/Treasury key, AdminGate master key, UpdateGate signers, and any
     other long-horizon keys are:

        - Generated fresh (never used on devnet).
        - Stored according to the long-term keys plan
          (LUKS USB, hardware wallets, backups, off-site copy).
        - Associated with human-readable labels and physical inventory.

---

## 2. High-level phases of LIVE bootstrap

The LIVE bootstrap is conceptually split into phases:

1. **Freeze and announce**

   - Choose a bootstrap window and freeze any changes to core code and
     contracts.
   - Announce a maintenance window for devnet/test systems as needed.

2. **Offline review and signing rehearsal**

   - Load the locked PLAN JSON on an offline machine.
   - Generate a human-readable description of what the bootstrap will do
     (addresses, balances, roles, gates, validator set).
   - Have multiple humans review and sign off on this description.
   - Rehearse signing flows with hardware wallets on a test chain.

3. **Anvil / forked-chain dry-run**

   - Spin up an anvil / forked-chain instance at chainId 2050 using the same
     PLAN.
   - Run the exact same script that will be used for LIVE, but pointed at this
     isolated environment.
   - Verify invariants after the dry-run:
        - Premine totals.
        - Treasury + OpsTreasury balances.
        - RewardEngine configuration.
        - ValidatorSet contents and initial weights.
        - AdminGate/UpdateGate wiring and signers.

4. **Mainnet LIVE broadcast**

   - During the scheduled window, with all humans present:
        - Confirm `PLAN` and all pillars are still GREEN.
        - Confirm safeboot node is synced and healthy.
        - Execute the bootstrap script(s) against the real mainnet RPC.
        - Sign each transaction with the correct hardware wallet(s), with
          out-of-band verification of:
            - Nonce
            - To address
            - Value
            - Data (function signature, key parameters)

5. **Post-bootstrap verification**

   - Run a dedicated post-bootstrap health script (to be written) that checks:
        - On-chain balances and roles match the PLAN.
        - RewardEngine and ValidatorSet match the PLAN.
        - AdminGate/UpdateGate are correctly wired and locked.
        - Safeboot sees the same state and can verify txroot/header3.

   - Update Prometheus textfile exporters and gauges to reflect:
        - `void_mainnet_bootstrap_done = 1`
        - `void_mainnet_bootstrap_health = 1`
        - Any additional “bootstrap receipts” metrics.

6. **Unfreeze and move to normal operations**

   - Once verification is complete and bootstrap health is GREEN, shift the
     network into normal mode:
        - Enable standard UpdateGate/ConfigGate policies.
        - Enable validators onboarding, JobQueue usage, Obelisk wallet flows.
        - Start regular operations SLOs and alerts.

---

## 3. Artefacts to be defined later

This DRAFT intentionally leaves the following as TODOs:

- Concrete script filenames for LIVE bootstrap (likely new `ops/` helpers and a
  dedicated Foundry script).
- Exact CLI commands (forge, curl, jq, etc.) to be run during each phase.
- Exact Prometheus metrics and textfile files for “bootstrap_done” and
  “bootstrap_health”.
- Specific time windows, notification channels, and human sign-off procedure.

These will be filled in once:

- The PLAN pillar is GREEN.
- The team has finalized the key inventory and human roles.
- We have completed at least one full rehearsal on a forked chain.

---

## 4. Non-goals

This LIVE runbook will **not**:

- Change or redefine the locked PLAN.
- Cover devnet/testnet bootstraps (those are separate docs/scripts).
- Replace the governance / update policy; it only references them.

---

## 5. Next steps to move this from DRAFT to v1

To promote this doc to a real v1 runbook, we will:

1. Fill in the concrete command sequences for each phase.
2. Add references to the exact tags/versions of contracts and node.
3. Add references to the keys inventory and how to verify each address.
4. Add a mandatory checklist at the end with sign-off fields.

Until then, treat this document as **read-only planning**.
