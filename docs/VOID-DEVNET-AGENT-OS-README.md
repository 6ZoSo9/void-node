# VOID Devnet – Agent OS README (v1)

This document explains the **VOID devnet agent OS** and how it interacts with:

- On-chain contracts (JobQueue, ReceiptRegistry, AgentRegistry, ModelRegistry, AdminGate)
- Off-chain scripts (`ops/` and `~/.local/bin/`)
- Systemd timers for sweeps and health checks
- Coverage metrics for jobs vs receipts

This is **DEVNET ONLY** for chainId **2050**. Mainnet will evolve from this, but this is the working, tested reference.

---

## 1. On-chain prerequisites (devnet)

Core addresses are taken from:

- `docs/VOID-DEVNET-PROTOCOL-STATE.json`

Important fields:

- `chainId` (must be `2050` for devnet)
- `AdminGate`
- `JobQueue`
- `ReceiptRegistry`
- `AgentRegistry`
- `ModelRegistry`

The agent OS scripts **never hardcode** these; they read from the JSON state file.

---

## 2. Key files and directories

### 2.1 State + manifests

- `docs/VOID-DEVNET-PROTOCOL-STATE.json`  
  Canonical devnet state (addresses, chainId, admin, etc.).

- `docs/VOID-DEVNET-MANIFESTS/VOID-DEVNET-MANIFEST-YYYYMMDDTHHMMSSZ.json`  
  One JSON **manifest per job input** (prompt + metadata).

- `docs/VOID-DEVNET-MANIFEST-INDEX.txt`  
  Mapping of **manifest → jobId**.  
  Format (space-separated):  
  `<manifestPath> <jobId>`

### 2.2 Job spool

- `docs/VOID-DEVNET-JOB-SPOOL.txt`  
  One `jobId` (0x…) per line.  
  This is the **source of truth** for jobs that the sweep script inspects.

### 2.3 Coverage metrics

- `~/.cache/node-exporter-textfile/void_devnet_coverage.prom`  
  Textfile exposing devnet coverage metrics:

  - `void_devnet_coverage{chain="devnet"}` (0..1)
  - `void_devnet_jobs_total{chain="devnet"}`
  - `void_devnet_receipts_total{chain="devnet"}`
  - `void_devnet_coverage_health{chain="devnet"}` (1 if jobs==receipts)

This cache file is what the status and health scripts read, and is intended to be scraped (directly or via node_exporter textfile).

---

## 3. Core scripts

### 3.1 System deploy (contracts)

- `ops/void-devnet-system-deploy.sh`  
- `ops/void-devnet-system-deploy-v2.sh`  

Deploys the core devnet contracts (AdminGate, JobQueue, ReceiptRegistry, AgentRegistry, ModelRegistry), then writes:

- `docs/VOID-DEVNET-PROTOCOL-STATE.json` (addresses, chainId=2050)
- Any additional metadata required by the agent OS

These scripts are **prerequisites** for everything else.

---

### 3.2 High-level manifest runner

- `~/.local/bin/void-devnet-manifest-run.sh`

This is the main **end-to-end driver** for a single job.

**Step 1 – Create manifest from prompt**

- Takes a prompt string, e.g.:  
  `demo: write a haiku about Void devnet v7`
- Writes a new manifest JSON under `docs/VOID-DEVNET-MANIFESTS/`.
- Computes `payloadHash` from the manifest.
- Logs the manifest path and hash.

**Step 2 – Post job from manifest**

- Reads `JobQueue` and `chainId` from `docs/VOID-DEVNET-PROTOCOL-STATE.json`.
- Calls `void-devnet-post-job.sh` with:
  - `APP_ID=void-demo-app-1`
  - `MODEL_ID=void-demo-llm-1`
  - `PAYLOAD_HASH=<hash of manifest>`
- On success, gets a `jobId` and:
  - Appends `jobId` to `docs/VOID-DEVNET-JOB-SPOOL.txt`.
  - Records `manifest → jobId` in `docs/VOID-DEVNET-MANIFEST-INDEX.txt`.

**Step 3 – Sweep jobs with agent OS**

- Delegates to the sweep script (see below).
- The sweep finds the new job, runs agent OS, writes a receipt, and completes the job.

**Step 4 – Recompute coverage**

- Rebuilds `void_devnet_coverage.prom` by scanning all jobs and receipts on-chain.
- Sets:
  - `coverage = receipts / jobs`
  - `coverage_health = 1` if `coverage == 1`, else `0`.

**Step 5 – Inspect manifest → job → receipts**

- Runs a manifest inspection pass so you can immediately see:
  - `jobId`
  - Receipt IDs and core fields (modelId, hashes, timestamps, status).

Example usage (from repo root):

    ~/.local/bin/void-devnet-manifest-run.sh "demo: write a haiku about Void devnet vN"

---

### 3.3 Sweep jobs (agent OS integration)

- `~/.local/bin/void-devnet-agent-sweep.sh`  
  (Wrapped by systemd timer `void-devnet-agent-sweep.timer`.)

Responsibilities:

1. Read state from:
   - `docs/VOID-DEVNET-PROTOCOL-STATE.json`
   - `docs/VOID-DEVNET-JOB-SPOOL.txt`

2. For each `jobId` in the spool:
   - Query on-chain status via JobQueue:
     - `status_raw`
     - `hasResult`
   - If `status_raw == 3` **and** `hasResult == true` → skip (already fully processed).
   - If `status_raw == 1` (Posted) and `hasResult == false` → **hand off to agent OS**.

3. When processing a job:
   - Calls the agent OS script with environment variables:
     - `STATE_FILE=docs/VOID-DEVNET-PROTOCOL-STATE.json`
     - `RPC_URL`
     - `JOB_ID`
     - `MODEL_ID` (currently `void-demo-llm-1` for demo)
     - `INPUT_HASH`, `OUTPUT_HASH`, `MODEL_HASH`, `RESULT_HASH` (demo values)
   - The agent OS then:
     - Claims the job on JobQueue.
     - Submits a receipt to ReceiptRegistry.
     - Marks the job as completed (status=3) with the `RESULT_HASH`.

If agent OS fails for a job (e.g., `nonce too low`), the sweep script logs a **WARN** but does not abort overall processing. You can rerun the sweep later.

---

### 3.4 Agent OS script (on-chain actions only)

The agent OS script is responsible for **on-chain side effects only**. It does **not** run real LLM inference yet; it uses placeholder hashes.

High-level steps for one job:

1. Load **state** from `docs/VOID-DEVNET-PROTOCOL-STATE.json`:
   - `AdminGate`
   - `JobQueue`
   - `ReceiptRegistry`
   - `AgentRegistry`
   - `chainId`

2. Verify `JOB_ID` status via JobQueue:
   - If `status != 1` (not Posted) or `hasResult == true`, abort.

3. **Claim job**:
   - Send a tx to JobQueue to claim the job under `DEV_AGENT_ADDR`.
   - On success, status becomes `2` (Claimed).

4. **Submit receipt**:
   - Call `ReceiptRegistry` with:
     - `jobId`
     - `receiptId` (derived)
     - `modelId` (e.g., `void-demo-llm-1`)
     - `inputHash`, `outputHash`, `modelHash`, `resultHash`
   - On success, a `ReceiptRecorded` event is emitted.

5. **Complete job**:
   - Final tx to JobQueue to mark job as completed:
     - Includes `RESULT_HASH`.
   - On success:
     - Job status becomes `3`.
     - `hasResult == true`.

Later phases will replace the fixed hashes with real **off-chain inference** + hashing pipeline. For now, this is a **skeleton agent** that proves:

- Job lifecycle works end to end.
- Receipts are written and linked to jobs.
- Coverage metrics can hit and stay at 1.0.

---

### 3.5 Status + health wrappers

- `ops/void-devnet-status.sh`  
  Recomputes coverage from on-chain JobQueue + ReceiptRegistry, writes `void_devnet_coverage.prom`, and prints:

  - `coverage`, `jobs`, `receipts`, `coverage_health`
  - Tail of `VOID-DEVNET-MANIFEST-INDEX.txt`
  - Truncated job summaries (`HAS_RECEIPTS` vs `NO_RECEIPTS`).

- `ops/void-devnet-agent-health.sh`  
  Thin wrapper around `void-devnet-status.sh`. It:

  - Reads the coverage file.
  - Sets exit code:
    - `0` when `coverage_health == 1`
    - Non-zero otherwise.

Used by systemd as a periodic **health probe**.

---

## 4. Systemd integration (user services)

All systemd units here are **user units**, located at:

- `~/.config/systemd/user/`

### 4.1 Agent sweep timer

Service:

- `void-devnet-agent-sweep.service`

  - `Type=oneshot`
  - `WorkingDirectory=%h/dev/void-node`
  - `ExecStart=%h/dev/void-node/ops/void-devnet-agent-sweep.sh`

Timer:

- `void-devnet-agent-sweep.timer`

  - `OnBootSec=60s`
  - `OnUnitActiveSec=60s` (example dev interval)
  - `Persistent=true`

Typical dev commands:

    systemctl --user enable --now void-devnet-agent-sweep.timer
    systemctl --user list-timers 'void-devnet-agent-sweep*'
    journalctl --user -u void-devnet-agent-sweep.service -n 30 -o cat

### 4.2 Agent health timer

Service:

- `void-devnet-agent-health.service`

  - `Type=oneshot`
  - `WorkingDirectory=%h/dev/void-node`
  - `ExecStart=%h/dev/void-node/ops/void-devnet-agent-health.sh`

Timer:

- `void-devnet-agent-health.timer`

  - `OnBootSec=2min`
  - `OnUnitActiveSec=5min`
  - `AccuracySec=30s`
  - `Persistent=true`

Typical dev commands:

    systemctl --user enable --now void-devnet-agent-health.timer
    systemctl --user list-timers 'void-devnet-agent-health*'
    journalctl --user -u void-devnet-agent-health.service -n 30 -o cat

A non-zero exit from `void-devnet-agent-health.service` means **coverage broken** (jobs != receipts) or some other failure in the status script.

---

## 5. Expected green-state

When everything is healthy on devnet, you should see:

### 5.1 Status script

    ./ops/void-devnet-status.sh

Output should include:

- `void_devnet_coverage{chain="devnet"} 1`
- `void_devnet_jobs_total{chain="devnet"} N`
- `void_devnet_receipts_total{chain="devnet"} N`
- `void_devnet_coverage_health{chain="devnet"} 1`
- All jobs in the summary listed as `HAS_RECEIPTS`.

### 5.2 Agent health

    ./ops/void-devnet-agent-health.sh
    echo "[exit code] $?"

Exit code should be `0` when green.

### 5.3 Systemd timers

    systemctl --user list-timers 'void-devnet-agent-*'

Both sweep and health timers present, with recent `LAST` and sane `NEXT` values.

This gives you a **self-healing devnet loop**:

- New jobs are posted (manually or via demo scripts).
- Agent OS claims, writes receipts, and completes jobs.
- Coverage metric tracks jobs vs receipts.
- Timers keep sweeping and checking health in the background.
