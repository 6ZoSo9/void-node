# VOID mainnet bootstrap RUN design (planning only)

**Status:** Planning-only. No broadcasts. All scripts that actually send
transactions remain DISABLED until this design is finalized and signed off.

This doc describes the intended structure of the REAL VOID mainnet bootstrap
(`run()`), building on top of the existing PLAN-only and keys phases.

---

## 1. Preconditions before RUN is even considered

Before we enable any broadcast-capable script, ALL of the following must be
true and stable:

1. **Node + pillars health:**
   - `./ops/pillars-preflight.sh` returns OK.
   - `void_devnet_overall_health == 1`
   - `void_mainnet_core_health == 1`
   - `void:mainnet_lastmile:health:last_5m == 1`
   - `safeboot_overall == 1` (or equivalent safeboot metric once fully wired).

2. **Dev PLAN rehearsal:**
   - `./ops/void-dev-plan-checklist.sh` returns OK.
   - Dev PLAN Anvil-2050 rehearsal doc is up-to-date:
     `docs/VOID-MAINNET-BOOTSTRAP-DEV-ANVIL-REHEARSAL.md`.

3. **Mainnet PLAN + keys:**
   - `./ops/void-mainnet-plan-checklist.sh` returns OK.
   - `void_mainnet_bootstrap_plan_health == 1` (PLAN exporter).
   - `void_mainnet_keys_roles_ok == 1` (keys exporter).
   - `void:mainnet_pillars:health_with_keys:last_5m == 1`.

4. **LIVE JSON sanity and stub transition:**
   - `./ops/void-mainnet-plan-stub-guard.sh` has been run regularly during the
     stub-only phase (all contracts zero).
   - A conscious, documented decision is made to move from:
       - `contracts.* = 0x0000...0000` (stub-only) to
       - `contracts.* = real mainnet addresses` (RUN-ready).
   - This transition is recorded in git (tag) and in this doc.

5. **Key ceremony:**
   - Mainnet deployer, Treasury, OpsTreasury, AdminGate, UpdateGate,
     ConfigGate, RewardEngine, ValidatorSet, etc. keys are:
       - Fresh (never used on other networks).
       - Backed up on LUKS-encrypted media / hardware wallet.
       - Mapped in `/mnt/voidkey/meta/mainnet-roles-mapping.txt`.
   - The mapping has been verified against the LIVE JSON with:
       - `./ops/void-mainnet-roles-verify.sh`
       - `./ops/void-mainnet-keys-health.sh`

---

## 2. High-level RUN sequence (conceptual)

**This section is a design sketch, NOT an implementation.** The actual script
that performs RUN will be created later, once this design is stable.

The intended high-level flow for RUN is:

1. **Preflight gate:**
   - Re-run all of:
     - `./ops/pillars-preflight.sh`
     - `./ops/void-dev-plan-checklist.sh`
     - `./ops/void-mainnet-plan-checklist.sh`
     - `./ops/void-mainnet-plan-stub-guard.sh` (expected to show non-zero
       contracts at this point, but only AFTER we have consciously updated
       the LIVE JSON).
   - Abort if any of these fail.

2. **Bootstrap contracts deployment (one-shot):**
   - Using a dedicated RUN script (name TBD, e.g.
     `ops/void-mainnet-bootstrap-mainnet-run.sh`) that:
       - Reads `config/void-mainnet-bootstrap-mainnet.live.json`.
       - Uses a single deployer key for initial contract deployments.
       - Writes all deployed addresses back into the LIVE JSON (or a separate
         deployed state file) in a deterministic, audit-friendly way.
   - This step is **one-time only** on mainnet. The script must be designed
     to fail fast if it detects any previously-deployed contracts.

3. **Post-deploy wiring + verification:**
   - Immediately after deployment, a verification script (TBD) must:
       - Call view functions on:
         - VoidToken
         - VoidTreasury / OpsTreasury
         - AdminGate / ConfigGate / UpdateGate
         - ValidatorSet / RewardEngine / EmissionsController
       - Confirm:
         - MAX_SUPPLY / premine match the tokenomics spec.
         - Treasury holds the premine, not the deployer.
         - Admin/owner roles match the roles mapping.
         - ValidatorSet state matches the initial validator configuration.
       - Emit a machine-readable summary (JSON) and a human-readable log.

4. **Metrics + Prometheus integration:**
   - After RUN succeeds, new exporters / textfile metrics should:
       - Record that RUN has been completed (e.g. `void_mainnet_bootstrap_run_ok`).
       - Record the deployed contract addresses and possibly a checksum of the
         LIVE JSON used.
   - A new Prometheus recording rule should gate overall mainnet health on
     `run_ok` AND the existing pillars.

5. **Final tag + freeze:**
   - Once RUN is complete and verification passes:
       - Create a git tag for the exact commit used for bootstrap.
       - Snapshot relevant configs and metrics.
       - Treat the LIVE JSON and roles mapping as **frozen historical
         artifacts** for the genesis bootstrap.

---

## 3. Open design questions / TODO

These items must be resolved before any RUN implementation:

1. **Exact script naming and boundaries:**
   - Decide on final script names for:
     - bootstrap RUN (broadcasting)
     - post-deploy verification
     - RUN-related Prometheus exporters.

2. **Idempotency and replay protection:**
   - Define how the RUN script decides "safe to run vs already run".
   - Consider using:
     - On-chain sentinel state (e.g. a versioned Config contract).
     - A local state file with a hash of the LIVE JSON and deployment tx hashes.

3. **Key handling during RUN:**
   - Decide how deployer and admin keys are loaded:
     - Foundry `--mnemonic` / `--keystore` / `cast` env bindings.
     - Offline signing vs online hot key.
   - Ensure this design minimizes hot key exposure during the bootstrap window.

4. **Validator seeding and initial stake:**
   - Finalize how initial validators receive stake:
     - Direct premine allocations.
     - Post-bootstrap deposits.
   - Ensure the RUN + post-verification steps prove this wiring.

5. **Rollback / failure scenarios:**
   - Document what happens if RUN fails halfway:
     - Under what conditions can we safely restart on the real mainnet?
     - When would we abort and choose a new chainId / genesis instead?

This doc is the canonical place to evolve the RUN design. Implementation of
any broadcast-capable scripts must reference this design and should not be
written until the open questions above are answered and signed off.

---

## 4. Proposed script naming and boundaries

To keep the RUN path understandable and auditable, we will split responsibilities
across a small, clear set of scripts under `ops/`:

1. Preflight gate (no broadcasts):

    - `ops/void-mainnet-bootstrap-run-preflight.sh`
    - Responsibilities:
        - Run `./ops/pillars-preflight.sh`
        - Run `./ops/void-dev-plan-checklist.sh`
        - Run `./ops/void-mainnet-plan-checklist.sh`
        - Optionally run `./ops/void-mainnet-plan-stub-guard.sh` in a mode that
          expects non-zero contracts once LIVE JSON is populated.
        - Fail fast if any of the above are not green.
    - This script never broadcasts transactions.

2. RUN (broadcast-capable, strictly gated):

    - `ops/void-mainnet-bootstrap-run.sh`
    - Responsibilities:
        - Read `config/void-mainnet-bootstrap-mainnet.live.json`.
        - Call the Forge script (e.g. `VoidMainnetBootstrapMainnet.run`) that
          actually deploys and wires contracts on mainnet.
        - Refuse to run if any on-chain or local sentinel indicates that RUN
          has already been executed.
    - This script will remain DISABLED until:
        - The RUN design in this doc is complete.
        - Keys and roles have been finalized and rehearsed.
        - A separate review has signed off on the bootstrap plan.

3. Post-deploy verification:

    - `ops/void-mainnet-bootstrap-run-verify.sh`
    - Responsibilities:
        - Query on-chain state for:
            - VoidToken, VoidTreasury, OpsTreasury
            - AdminGate, UpdateGate, ConfigGate
            - ValidatorSet, RewardEngine, EmissionsController
        - Validate:
            - Tokenomics (MAX_SUPPLY, premine, Treasury balances).
            - Ownership / admin roles vs the roles mapping.
            - Initial validator configuration vs expected.
        - Emit:
            - A machine-readable JSON summary.
            - A human-readable log similar to the dev PLAN rehearsal doc.

4. RUN status exporter:

    - `ops/void-mainnet-bootstrap-run-exporter.sh`
    - Responsibilities:
        - Produce a textfile for node_exporter with gauges such as:
            - `void_mainnet_bootstrap_run_ok`
            - `void_mainnet_bootstrap_run_config_hash`
            - `void_mainnet_bootstrap_run_livejson_hash`
        - Allow Prometheus to gate overall mainnet health on RUN having
          completed successfully, on top of the existing pillars and keys.

The actual implementation of these scripts will follow once this design and
the open questions in section 3 have been resolved. Until then, any existing
broadcast skeletons must remain hard-disabled (exit with a clear FATAL message).

## Quick RUN preflight hammer

Before any discussion of enabling a real RUN/broadcast script, use:

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-bootstrap-run-preflight.sh

This will:

1. Call `ops/void-mainnet-pillars-health-all.sh` to confirm safeboot, devnet,
   mainnet-core, manifest, and keys are all healthy.
2. Run the dev PLAN checklist (`ops/void-dev-plan-checklist.sh`).
3. Run the mainnet PLAN + keys checklist (`ops/void-mainnet-plan-checklist.sh`).
4. Run the stub-only guard (`ops/void-mainnet-plan-stub-guard.sh`) and confirm
   that all core contract addresses in the LIVE JSON are still zero.

As long as this preflight gate is green, we know the environment is healthy and
we are still in the PLAN-only / stub-only phase for mainnet.
