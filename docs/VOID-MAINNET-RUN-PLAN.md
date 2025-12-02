# VOID Mainnet Bootstrap — RUN Phase Plan (Planning-Only)

Status as of 2025-12-02
-----------------------

- Branch: `feat/mainnet-core-20251120`
- Pillars:
  - `safeboot_overall = 1`
  - `void_devnet_overall_health = 1`
  - `void_mainnet_core_health = 1`
  - `void_mainnet_core_manifest_health = 1`
  - `void_mainnet_core_manifest_days = 365`
- Keys pillar:
  - `void_mainnet_keys_roles_ok = 1`
  - Roles mapping on `/mnt/voidkey/meta/mainnet-roles-mapping.txt` matches
    `config/void-mainnet-bootstrap-mainnet.live.json`.
- PLAN pillar:
  - `void_mainnet_bootstrap_plan_health = 1`
  - All tracked roles non-zero.
  - All core contract slots still ZERO (stub-only): `voidToken`, `VoidTreasury`,
    `OpsTreasury`, `AdminGate`, `UpdateGate`, `ConfigGate`, `ValidatorSet`,
    `RewardEngine`, etc.
- RUN pillar (planning-only):
  - Textfile exporter: `/var/lib/node_exporter/textfile_collector/void_mainnet_run_state.prom`
  - Gauges:
    - `void_mainnet_run_state{status="NOT_STARTED",plan_version="v1",hash_match="UNKNOWN"} 1`
    - `void_mainnet_run_status 0`
    - `void_mainnet_run_chainid 2050`
  - Local state file: `config/void-mainnet-bootstrap-mainnet.state.json`
    - `status      = "NOT_STARTED"`
    - `chainId     = 2050`
    - `planVersion = "v1"`
    - `liveHash    = <matches live JSON>`
    - `runTxs      = 0`
    - `startedAt   = null`
    - `completedAt = null`
  - RUN status helper + Prom diag confirm:
    - chainId(config) == chainId(RPC) == 2050
    - state.hash_match = MATCH
    - sentinel = STUB
    - `void_mainnet_run_status = 0` (NOT_STARTED)

RUN State Machine (intended)
----------------------------

Target numeric encoding (already in exporter):

- `0 = NOT_STARTED`
- `1 = IN_PROGRESS`
- `2 = COMPLETED`
- `-1 = FAILED`
- `-2 = UNKNOWN`

Planned transitions:

1. **NOT_STARTED → IN_PROGRESS**
   - Preconditions:
     - `void:mainnet_pillars:health_with_keys:last_5m == 1`
       (safeboot + devnet + mainnet-core + manifest + keys healthy)
     - PLAN health = 1 (current live JSON structurally sane).
     - `state.status == "NOT_STARTED"`
     - `state.liveHash` matches current LIVE JSON hash.
   - Actions:
     - Record `startedAt` (wall-clock timestamp).
     - Set `state.status = "IN_PROGRESS"`.
     - Optionally `runTxs = 0`.
     - Export updated textfile and verify via Prom.

2. **IN_PROGRESS → COMPLETED**
   - Preconditions (for *real* mainnet, not yet implemented):
     - All planned deployments and wiring transactions for:
       - `VoidToken` (+ premine vault if used)
       - `VoidTreasury`, `OpsTreasury`
       - `AdminGate`, `UpdateGate`, `ConfigGate`
       - `ValidatorSet`
       - `VoidEmissionsController`
       - `RewardEngine`
       - Genesis validator0 registration
     - On-chain wiring and ownership matches `live.json`:
       - Treasury owners, ops owners, validator admin, gate owners, etc.
     - PLAN exporter flipped to `plan_health = 1` **after** verifying live addresses.
     - Sentinel contract / ConfigGate key agrees that bootstrap is done.
   - Actions:
     - Set `state.status = "COMPLETED"`.
     - Set `state.runTxs = <# of txs used for bootstrap>`.
     - Set `completedAt = <timestamp>`.
     - Export updated textfile; Prom RUN rules compute 5m view.

3. **IN_PROGRESS → FAILED**
   - Preconditions:
     - Operator manually flags failure (e.g. partial broadcast, revert mid-sequence).
   - Actions:
     - Set `state.status = "FAILED"`.
     - Optionally include an error note in the state JSON (out-of-band) or
       separate log file.
     - RUN health drops to 0; future run attempts require manual intervention
       and probably a fresh config / state file.

4. **NOT_STARTED / IN_PROGRESS / COMPLETED → UNKNOWN**
   - Used only if:
     - `state.chainId` mismatches config/RPC chain ID, or
     - `state.liveHash` mismatches current LIVE JSON hash (stale config), or
     - state file is unreadable / malformed.
   - Actions:
     - Export `void_mainnet_run_state{status="UNKNOWN",hash_match="MISMATCH"}`.
     - `void_mainnet_run_status = -2`.
     - Pre-push / pre-broadcast gates MUST treat this as a hard failure.

Sentinel Design (not implemented yet)
-------------------------------------

Goal: have an **on-chain truth source** that can be compared against the local
`state.json` + textfile export.

Two likely approaches:

1. **Dedicated Sentinel Contract**
   - Small contract deployed during bootstrap:
     - Keeps:
       - `chainId`
       - `configHash` (hash of FINAL live JSON)
       - `runStatus` enum (NOT_STARTED / IN_PROGRESS / COMPLETED / FAILED)
       - Optional `runTxs`, `completedAt`, etc.
   - Only callable by a tightly-controlled deployer / AdminGate / ConfigGate
     authority.
   - Local `run-status` helper calls into this contract and compares:
     - `chainId`, `configHash`, `runStatus` vs local state.
   - Prom gauges derive a boolean “local vs on-chain” agreement flag.

2. **ConfigGate-backed Key**
   - Store the equivalent of:
     - `bootstrap.runStatus`
     - `bootstrap.configHash`
     in ConfigGate as simple key/value pairs.
   - Advantage:
     - Reuses existing governance infra.
   - Disadvantage:
     - Slightly less explicit than a dedicated sentinel contract, but simpler.

Initial plan: keep scripts **planning-only**, and when we implement real wiring:

- Introduce a minimal `BootstrapSentinel` contract **or** ConfigGate keys.
- Wire RUN status helper to read that sentinel, but **only** after we’re happy
  with the Solidity and tests.

What RUN Needs To Gate In The End
---------------------------------

Final mainnet “overall” health should eventually AND together:

- devnet overall
- mainnet core pillar (including safeboot + manifest)
- mainnet last-mile pillar
- keys pillar (roles mapping vs live JSON)
- PLAN pillar (bootstrap config is structurally ready)
- RUN pillar (for now: `NOT_STARTED`; later: `COMPLETED`)

Rough idea for RUN health (Prometheus side):

- Planning-only phase (current):
  - RUN health = 1 if:
    - `void_mainnet_run_status == 0` (NOT_STARTED)
    - hash_match != "MISMATCH"
    - chainId(config) == chainId(RPC)
- Post-bootstrap phase (future):
  - RUN health = 1 if:
    - `void_mainnet_run_status == 2` (COMPLETED)
    - on-chain sentinel agrees with local state
    - plan exporter flipped to `plan_health = 1` with FINAL addresses.

Next Concrete Work Items
------------------------

Short-term (still planning-only; safe to do before real wiring):

1. Make sure Prometheus is actually loading `prom/void-mainnet-run-rules.yml`
   and we have a recording like:
   - `void:mainnet_run_status:last_5m`
2. Add an ops helper:
   - `ops/void-mainnet-run-health-all.sh`
   that checks:
   - `void_mainnet_run_status` (raw gauge)
   - any RUN recording rules
   - and prints a one-line summary usable by pre-push/pillars.

Medium-term (first wiring passes, but still against anvil/dev):

3. Implement a **pure dev rehearsal** `VoidMainnetBootstrapDevRun.s.sol` that:
   - Actually deploys a dummy set of contracts on devnet/anvil (not mainnet).
   - Exercises the intended sequence of steps (VoidToken -> Treasuries ->
     Gates -> ValidatorSet -> RewardEngine -> validator0).
   - Updates a *dev* RUN state JSON.
   - Proves the state machine shape.

Long-term (real mainnet bootstrap):

4. Implement the **real** `VoidMainnetBootstrapMainnet.run()` wiring:
   - Use fresh mainnet keys (LUKS/hardware stored).
   - Execute the deployment and wiring sequence exactly once.
   - Write FINAL addresses back into LIVE JSON (or a sibling snapshot file).
   - Update RUN state to `COMPLETED` and push sentinel updates.
   - Guard everything with preflight scripts + Prometheus gates so broadcast
     cannot be triggered unless:
     - devnet + mainnet-core + last-mile + safeboot + plan + keys pillars are all 1.
     - RUN state is `NOT_STARTED` and hashes match.

This document is the source of truth for what the RUN pillar is allowed to do,
so any future changes to bootstrap wiring must be reflected here.
