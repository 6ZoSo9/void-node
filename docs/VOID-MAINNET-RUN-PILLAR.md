# VOID Mainnet — RUN Pillar (Planning-Only)

## 1. Purpose

The **RUN pillar** tracks the lifecycle of the *real* VOID mainnet bootstrap `run()`:
- It is **planning-only** right now.
- No mainnet broadcasts happen yet.
- We only expose **state + intent** via metrics.

The goal is to have a simple, Prometheus-visible state machine that tells us:

- Has mainnet bootstrap `run()` started?
- Has it completed?
- Did it fail?
- Is the local view consistent with the current LIVE JSON config?

This gives us a clean bridge between:
- Human-run bootstrap ceremonies, and
- Automated SLOs / gates in CI and ops.

## 2. Metrics

### 2.1 Core gauges

Exposed via node_exporter textfile collector:

- `void_mainnet_run_state{status,plan_version,hash_match} 1`
- `void_mainnet_run_status`

#### 2.1.1 `void_mainnet_run_state`

Labeled view:

- `status` (label):
  - `NOT_STARTED`
  - `IN_PROGRESS`
  - `COMPLETED`
  - `FAILED`
  - `UNKNOWN` (fallback)
- `plan_version` (label):
  - Currently `v1`.
- `hash_match` (label):
  - `MATCH`       — local state file hash matches current LIVE config
  - `MISMATCH`    — local state vs LIVE config diverged (bad)
  - `UNKNOWN`     — exporter could not verify hash (e.g. no cast / RPC)

Gauge value is always `1`; information lives in labels.

#### 2.1.2 `void_mainnet_run_status`

Numeric encoding of `status`:

- `0`  — `NOT_STARTED`
- `1`  — `IN_PROGRESS`
- `2`  — `COMPLETED`
- `-1` — `FAILED`
- `-2` — `UNKNOWN` / no reliable state

This is intended for recording rules and alerts.

### 2.2 Recording rules (planning-only)

Defined in:

- `prom/void-mainnet-run-rules.yml`

Recording rule (current):

- `void:mainnet_run_status:last_5m`

This is a **planning-only** rule that smooths the numeric status over 5 minutes.  
As of this phase, the rules file exists but wiring into Prometheus `rule_files` is deliberate and controlled.

## 3. Exporters and helpers

### 3.1 State + textfile exporter

Script:

- `ops/void-mainnet-bootstrap-run-exporter.sh`

Key behavior:

- Reads:
  - LIVE config:
    - `config/void-mainnet-bootstrap-mainnet.live.json`
  - Local RUN state:
    - `config/void-mainnet-bootstrap-mainnet.state.json`
- Computes/compares:
  - `state.liveConfigHash` vs current LIVE JSON hash.
- Writes:
  - `/tmp/void_mainnet_run_state.prom` (local dev path)
  - For root wrapper: `/var/lib/node_exporter/textfile_collector/void_mainnet_run_state.prom`

The root wrapper:

- `ops/void-mainnet-bootstrap-run-exporter-root.sh`

This wrapper:

- Runs the exporter as root.
- Drops the `.prom` file into the node_exporter textfile directory.
- Currently marks `hash_match="UNKNOWN"` when it cannot safely verify the config hash (e.g. no `cast` context as root).

### 3.2 RUN status script

Helper:

- `ops/void-mainnet-bootstrap-run-status.sh`

Responsibilities (planning-only):

1. ChainId sanity:
   - Reads `chainId` from LIVE JSON.
   - Confirms `cast chain-id` (RPC) is 2050.
2. Local state visibility:
   - Reads `config/void-mainnet-bootstrap-mainnet.state.json`.
   - Prints:
     - `status`
     - `chainId`
     - `planVersion`
     - `liveHash`
     - `runTxs`
     - `startedAt`
     - `completedAt`
   - Verifies `state.liveConfigHash` matches current LIVE config hash.
3. Sentinel (STUB):
   - **Explicitly STUB-ONLY** for now.
   - Future: read an on-chain sentinel (contract or ConfigGate key) and compare its view against the local state.
4. Summary:
   - Prints chainId, status, hash_match interpretation.
   - Exit code reflects only **config/RPC sanity + local state visibility** in this phase.

### 3.3 RUN health hammer

Helper:

- `ops/void-mainnet-run-health-all.sh`

What it does:

1. Queries `void_mainnet_run_status`.
2. Queries `void_mainnet_run_state`.
3. (Best-effort) queries `void:mainnet_run_status:last_5m`.
4. Interprets **planning-only expectations**:
   - `void_mainnet_run_status == 0`
   - `status(label) == "NOT_STARTED"`
   - `hash_match != "MISMATCH"`
5. Returns:
   - `0` with:
     - `[RESULT] OK (RUN pillar is NOT_STARTED with non-mismatching config hash; planning-only)`
   - Non-zero if any of the expectations are violated.

This script is our main “RUN pillar hammer”.

## 4. Current phase semantics

Right now, VOID mainnet bootstrap `run()` is **stub-only**:

- `VoidMainnetBootstrapMainnet.run(configPath)`:
  - Parses LIVE JSON.
  - Logs roles, contracts, validator0.
  - Prints a high-level PLAN narrative.
  - **Always reverts** with:
    - `stub only; implement real wiring before broadcast`

The RUN pillar is therefore explicitly expected to show:

- Numeric:
  - `void_mainnet_run_status = 0`
- Labels:
  - `status="NOT_STARTED"`
  - `plan_version="v1"`
  - `hash_match="MATCH"` (local dev exporter)
  - `hash_match="UNKNOWN"` (node_exporter root wrapper view)
- Interpretation:
  - “We have a PLAN and a state file, but no `run()` executions have occurred yet.”

## 5. How this evolves later

When we approach real mainnet bootstrap, the RUN pillar is intended to evolve:

1. **State machine wiring**:
   - `NOT_STARTED` → `IN_PROGRESS` → `COMPLETED` or `FAILED`.
   - Tied to:
     - `run()` broadcast start.
     - Transaction count (`runTxs`).
     - Final outcome (success/failure, with error context).

2. **On-chain sentinel**:
   - Dedicated contract or ConfigGate entry that reflects:
     - Bootstrap stage.
     - Version.
     - Possibly a hash of the LIVE config used.
   - RUN status script will:
     - Read local state.
     - Read sentinel.
     - Compare them and set:
       - `hash_match = MATCH / MISMATCH / UNKNOWN`.
     - Drive alerts / SLOs based on divergence.

3. **Prometheus SLOs / alerts**:
   - Recording rules for:
     - `void:mainnet_run_status:last_5m`
     - Possibly labeled views for `status="IN_PROGRESS"` and time bounds.
   - Alerts such as:
     - “RUN stuck IN_PROGRESS > N minutes.”
     - “RUN FAILED.”
     - “RUN completed but hash_match=MISMATCH.”

4. **CI / pre-push gates (future)**:
   - Pre-push / pre-broadcast scripts that:
     - Assert `status=NOT_STARTED` before we begin.
     - Assert `status=COMPLETED` and `hash_match=MATCH` after ceremony.
   - This will only be wired once we are ready for actual mainnet broadcast.

## 6. Current guarantees

In this planning-only checkpoint:

- RUN pillar is **visible** via:
  - `void_mainnet_run_state`
  - `void_mainnet_run_status`
- RUN pillar is **checked** via:
  - `ops/void-mainnet-run-health-all.sh`
- RUN pillar is **NOT** gating any real mainnet broadcast.
- Mainnet bootstrap remains:
  - Stub-only `run()` that never broadcasts.
  - Fully under human control.

This doc describes the intended behavior and expectations for the RUN pillar at this stub-only stage.
