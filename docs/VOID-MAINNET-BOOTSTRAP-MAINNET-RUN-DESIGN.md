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

---

## 5. Bootstrap state, idempotency, and replay protection

To prevent accidental re-running of the mainnet bootstrap on a live chain, the
RUN implementation will use two layers of protection:

1. A local bootstrap state file under \`config/\`.
2. An on-chain sentinel that marks bootstrap as completed.

The RUN script must treat either layer as authoritative to refuse a second run.

### 5.1 Local bootstrap state file

We will introduce a JSON file:

- \`config/void-mainnet-bootstrap-mainnet.state.json\`

Intended shape (example):

    {
      "version": 1,
      "status": "NOT_RUN",     // NOT_RUN | RUNNING | DONE | FAILED
      "liveConfigPath": "config/void-mainnet-bootstrap-mainnet.live.json",
      "liveConfigHash": "0x...",   // e.g. keccak256 of the LIVE JSON
      "planVersion": "ckpt-mainnet-plan-keys-stub-guard-YYYYMMDD-HHMMSS",
      "startedAt": null,
      "completedAt": null,
      "txs": {
        "updateGate": null,
        "adminGate": null,
        "configGate": null,
        "validatorSet": null,
        "voidToken": null,
        "premineVault": null,
        "treasury": null,
        "voidTreasury": null,
        "opsTreasury": null,
        "rewardEngine": null
      }
    }

RUN script responsibilities (local state perspective):

- Before doing anything:
  - If \`status == "DONE"\` and \`liveConfigHash\` matches the current LIVE JSON,
    abort with a clear error: "bootstrap already completed for this config".
  - If \`status == "RUNNING"\` and \`startedAt\` is recent, abort and require a
    manual operator decision (to avoid concurrent or overlapping runs).
- On first successful execution:
  - Set \`status = "DONE"\`.
  - Fill in \`startedAt\`, \`completedAt\`.
  - Record transaction hashes / deployed addresses in \`txs\`.
- On hard failure:
  - Set \`status = "FAILED"\` with enough detail for an operator to decide
    whether a retry is safe or whether a new chain / config is required.

The local state file is used by:

- The RUN script (to enforce idempotency).
- A future \`ops/void-mainnet-bootstrap-run-status.sh\` helper.
- A future Prometheus exporter (\`ops/void-mainnet-bootstrap-run-exporter.sh\`).

### 5.2 On-chain sentinel (ConfigGate / bootstrap-contract)

In addition to the local state, RUN must consult an on-chain sentinel before
broadcasting anything. The exact mechanism can be:

- A dedicated small \`VoidBootstrapState\` contract, or
- A reserved config key inside \`ConfigGate\` (preferred, if the API is suitable).

Intended behaviour (conceptual):

- View function, for example:

  - \`function bootstrapStatus() external view returns (uint8);\`
    - \`0 = NOT_RUN\`
    - \`1 = RUNNING\` (optional)
    - \`2 = DONE\`

Or equivalent using \`ConfigGate\` with a well-known key, such as:

- \`bytes32("VOID_MAINNET_BOOTSTRAP_STATUS")\`

RUN script responsibilities (on-chain sentinel perspective):

- Before broadcasting:
  - Query the sentinel:
    - If status is \`DONE\`, abort immediately: bootstrap already completed.
    - If status is anything other than \`NOT_RUN\`, abort and require operator
      intervention.
- During/after bootstrap:
  - On the final, successful step, set the sentinel to \`DONE\`.
  - This must be part of the same logical sequence as deploying the core
    contracts, so any later observer can trust the sentinel.

This sentinel is also the natural source for a Prometheus metric such as:

- \`void_mainnet_bootstrap_run_ok\`
- \`void_mainnet_bootstrap_run_status{status="DONE"}\`

### 5.3 Replay / fork considerations

The combination of local state + on-chain sentinel handles:

- Double-run on the same \`chainId\` + RPC: both layers say "DONE", RUN aborts.
- Config drift: if \`liveConfigHash\` changes but sentinel is still NOT_RUN,
  RUN can refuse until there is a clear, documented migration path or a new
  genesis.
- Fork / wrong RPC: if local state says NOT_RUN but on-chain sentinel says
  DONE, RUN must refuse and warn the operator they are pointed at an already
  bootstrapped network.

The detailed wiring (exact contract name, config key, and state schema) will be
finalized before implementing the broadcast-capable RUN script, but this section
captures the required behaviour and failure modes we must satisfy.

---

## 6. RUN status, reporting, and Prometheus metrics

Once the real broadcast-capable RUN flow exists, operators and CI need a
simple way to answer:

- Has bootstrap run?
- Did it succeed?
- Do the local state file and on-chain sentinel agree?
- Is this node pointed at the correct chain + config?

This section defines the status/reporting surface. The actual scripts and
Prometheus wiring will be implemented when RUN wiring is closer to final.

### 6.1 CLI status helper (`ops/void-mainnet-bootstrap-run-status.sh`)

We will add a CLI helper:

- `ops/void-mainnet-bootstrap-run-status.sh`

Responsibilities:

1. Resolve config + RPC:
   - Default LIVE config: `config/void-mainnet-bootstrap-mainnet.live.json`.
   - Default RPC: `http://127.0.0.1:8545` (can be overridden via `RPC_URL`).

2. Print chain + config summary:
   - `chainId` from RPC (via `cast chain-id`).
   - `chainId` from LIVE JSON.
   - A short summary of the roles/owners (best-effort).

3. Print local bootstrap state summary:
   - Load `config/void-mainnet-bootstrap-mainnet.state.json` if present.
   - Show:
     - `status` (NOT_RUN | RUNNING | DONE | FAILED)
     - `liveConfigPath`
     - `liveConfigHash`
     - `planVersion`
     - `startedAt` / `completedAt` (if any)
   - If the state file is missing, report `status = UNKNOWN` and exit with
     a non-zero code (so automation knows we are “pre-state-file”).

4. Print on-chain sentinel summary:
   - Query the bootstrap sentinel (either a dedicated contract or a
     `ConfigGate` key such as `VOID_MAINNET_BOOTSTRAP_STATUS`).
   - Render the sentinel value as:
     - `NOT_RUN` / `RUNNING` / `DONE` (or equivalent).
   - Surface any RPC / call failures clearly.

5. Compare local vs on-chain view:
   - If both read as `NOT_RUN` and config hashes agree: report a clean
     “pre-bootstrap” state.
   - If both read as `DONE` and config hashes agree: report “bootstrap
     completed” state.
   - If they disagree (e.g. local DONE but on-chain NOT_RUN or vice versa):
     highlight the mismatch and exit non-zero.

Exit-code contract:

- `0` when:
  - Local + on-chain views are consistent AND
  - State is one of the allowed modes (`NOT_RUN` or `DONE`).
- Non-zero when:
  - State file missing, or
  - Sentinel missing/unreadable, or
  - Local vs on-chain views disagree, or
  - Status is `RUNNING` / `FAILED` / unknown.

This script is intended for:

- Manual operator inspection.
- CI / automation hooks.
- Feeding into the Prometheus textfile exporter.

### 6.2 Textfile exporter (`ops/void-mainnet-bootstrap-run-exporter.sh`)

We will add a root-owned textfile exporter:

- `ops/void-mainnet-bootstrap-run-exporter.sh`
- Managed by a systemd service + timer (similar to other VOID exporters).
- Writes to:
  - `/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_run.prom`

Intended metric shape (example):

- Bootstrap status as mutually exclusive gauges:

    # 0/1 gauges, exactly one should be 1
    void_mainnet_bootstrap_run_status{status="NOT_RUN"}  0
    void_mainnet_bootstrap_run_status{status="RUNNING"}  0
    void_mainnet_bootstrap_run_status{status="DONE"}     1
    void_mainnet_bootstrap_run_status{status="FAILED"}   0

- Overall “OK” view:

    # 1 when we are in an allowed state (pre- or post-bootstrap) and
    # local/on-chain views agree.
    void_mainnet_bootstrap_run_ok 1

- Config fingerprint (best-effort):

    # Encodes which LIVE JSON this exporter is bound to.
    void_mainnet_bootstrap_run_config_hash{hash="0x..."} 1

- Optional timing metrics (seconds since epoch):

    # Can be used for dashboards / SLO-ish views.
    void_mainnet_bootstrap_run_started_at   0
    void_mainnet_bootstrap_run_completed_at 0

Exporter rules of thumb:

- Derive all values from:
  - The local state file (`*.state.json`), and
  - The on-chain sentinel view.
- Never derive anything from Prometheus itself.
- If either source is unreadable, set `run_ok = 0` and choose a clear status
  (`FAILED` or `UNKNOWN`) so alerts can fire.

### 6.3 Recording rules and alerts

We will add Prometheus recording rules (names subject to finalization):

- Smoothed OK view:

    void:mainnet_bootstrap_run:ok:last_5m =
      max_over_time(void_mainnet_bootstrap_run_ok[5m])

- Last known status (by label):

    void:mainnet_bootstrap_run:status:last_5m{status="DONE"} =
      max_over_time(void_mainnet_bootstrap_run_status{status="DONE"}[5m])

Alert sketch (examples):

- `VoidMainnetBootstrapRunFailed`:
  - Fires when:
    - `void:mainnet_bootstrap_run:ok:last_5m == 0`
  - Meaning:
    - Either the exporter cannot read state/sentinel, or
    - Local vs on-chain state disagrees, or
    - Status is FAILED/UNKNOWN.

- `VoidMainnetBootstrapRunUnexpectedState`:
  - Fires when:
    - Status is neither NOT_RUN nor DONE for a sustained period, *or*
    - Multiple `status=*` gauges appear as `1` simultaneously.

These metrics and alerts will be wired into the existing mainnet pillars once
the real RUN wiring is implemented. For now they live as design targets that
the exporter and systemd units must satisfy.


## RUN status helper (planning-only)

Before we ever enable a real RUN/broadcast flow, we keep a lightweight
planning-only status helper:

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-bootstrap-run-status.sh

This script:

- Confirms `config.chainId` matches the runtime chainId via `cast chain-id`.
- Reports the local RUN state file (if present): `status`, `liveConfigPath`,
  `liveConfigHash`, `planVersion`, `startedAt`, `completedAt`.
- Shows a stubbed "sentinel" status for the future on-chain bootstrap sentinel
  (e.g. dedicated contract or ConfigGate key).

While we are still in the PLAN-only phase:

- The state file `config/void-mainnet-bootstrap-mainnet.state.json` is expected
  to be missing or have `status = "UNKNOWN"`.
- The sentinel status is fixed to `"STUB"`.
- The script's exit code only reflects config/RPC sanity and file presence.

Later, when real RUN wiring is implemented, this helper will be extended to:

- Read the on-chain bootstrap sentinel.
- Cross-check local vs on-chain RUN status and surface clear states like
  `"NOT_STARTED"`, `"IN_PROGRESS"`, `"COMPLETED"`, `"ROLLBACK"`.
- Feed a dedicated Prometheus textfile exporter + pillar for "mainnet RUN"
  so CI and pre-push gates can assert that RUN has not been armed prematurely.
