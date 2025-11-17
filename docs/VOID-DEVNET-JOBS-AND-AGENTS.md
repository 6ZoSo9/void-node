# VOID Devnet – Jobs, Agents, and Telemetry (v1)

This doc freezes how VOID devnet handles **AI jobs and receipts** today.

- On-chain: `ModelRegistry` + `JobQueue` (chainId 2050, RPC 127.0.0.1:8545)
- Off-chain: JSONL files for jobs and receipts
- Monitoring: Prometheus metrics + alerts (no Grafana required)

The goal is to give us a full vertical:
user/dev script → job → (simulated) agent → receipt → metrics/alerts.

---

## 1. On-chain contracts (devnet EVM)

State file:

- `docs/VOID-DEVNET-PROTOCOL-STATE.json`

Key entries:

- `AdminGate` – master admin for devnet AI contracts
- `ModelRegistry` – on-chain registry of AI models
- `JobQueue` – on-chain registry of AI jobs (conceptual spec in
  `docs/MODELREGISTRY-CONTRACT.md` and `docs/JOBQUEUE-CONTRACT.md`)

Sanity check (already done, but documenting):

- `ModelRegistry.admin() == AdminGate`
- `JobQueue.admin() == AdminGate`

This is wired into the `void_devnet_contracts.prom` exporter and checked by
Prometheus via:

- `void_devnet_contracts_healthy`
- `void_devnet_modelregistry_admin_mismatch`
- `void_devnet_jobqueue_admin_mismatch`

---

## 2. Off-chain job + receipt files

Devnet uses simple JSONL files under `ops/devnet/`:

- `ops/devnet/jobs.jsonl`
- `ops/devnet/receipts.jsonl`

### 2.1 Job format (jobs.jsonl)

Conceptual shape:

  {
    "chainId": 2050,
    "jobId": "0xjob-devnet-1763314469",
    "status": "posted",
    "modelId": "gpt-4.1-mini",
    "postedBy": "0x0000000000000000000000000000000000000000",
    "agentHint": "obelisk-devnet-manual-1",
    "createdAt": 1763314469
  }

Notes:

- `jobId` is a human-readable ID for devnet (not necessarily the same as the
  on-chain `bytes32 jobId`, but in practice we can hash it).
- `modelId` must line up with what `ModelRegistry` expects (e.g. `gpt-4.1-mini`).
- `agentHint` is a hint string for which agent or agent class should pick it up.
- These jobs are **devnet artifacts** used by the agent simulator and
  exporters; they do not currently go on-chain.

### 2.2 Receipt format (receipts.jsonl)

Conceptual shape:

  {
    "chainId": 2050,
    "jobId": "0xjob-devnet-1763314469",
    "receiptId": "0xrcpt1",
    "status": "completed",
    "modelId": "gpt-4.1-mini",
    "postedBy": "0x111",
    "agent": "obelisk-devnet-agent-1",
    "receiptTs": 1763315728124
  }

Notes:

- One job can have one or more receipts (for devnet we treat “has ≥1” as
  “covered”).
- `agent` names the off-chain worker that created the receipt.
- `status` is currently `"completed"` only; we can extend to `"failed"`,
  `"cancelled"`, etc. later.

Receipts never go into VOID node right now; they’re used for **coverage
metrics and alerts**.

---

## 3. Devnet helper scripts

These live under `~/.local/bin` and `ops/devnet/` (names may vary slightly;
this is the intended design).

### 3.1 Job creation

CLI helper:

- `~/.local/bin/void-devnet-mk-job.sh`

Usage:

- Creates a new job entry in `ops/devnet/jobs.jsonl` with:
  - `modelId="gpt-4.1-mini"` (for now)
  - `agentHint="obelisk-devnet-manual-1"` (or similar)
  - `jobId="0xjob-devnet-<timestamp>"`

This is how we simulate a user/dapp posting a job into the devnet queue.

### 3.2 Agent simulator

Service + timer:

- `~/.local/bin/void-devnet-agent-sim.sh`
- `~/.config/systemd/user/void-devnet-agent-sim.service`
- `~/.config/systemd/user/void-devnet-agent-sim.timer`

Behavior:

- Reads `ops/devnet/jobs.jsonl`
- Reads/writes `ops/devnet/receipts.jsonl`
- For each job without a receipt, it appends a synthetic receipt and logs what
  it did.
- Runs periodically via systemd timer (every ~30s in our current setup).

This simulates an **Obelisk Agent** that keeps up with jobs.

### 3.3 Devnet smoke test

Helper:

- `~/.local/bin/void-devnet-smoke.sh`

Behavior:

- Creates a devnet job via `void-devnet-mk-job.sh`.
- Waits briefly for the agent sim + exporters.
- Queries Prometheus for:
  - `void:devnet:jobs_total`
  - `void:devnet:receipts_total`
  - `void:devnet:jobs_without_receipts`
  - `void:devnet:jobs_receipt_coverage`
  - and the per-model variants.

This gives a single-command smoke test that the devnet pipeline is alive.

---

## 4. Prometheus exporters and metrics

We use **textfile collectors** via node_exporter.

### 4.1 Global agent receipts exporter

Textfile:

- `~/.cache/node-exporter-textfile/void_agent_receipts.prom`
- Symlinked into `/var/lib/node_exporter/textfile_collector/`

Metrics:

- `void_agent_receipts_lines`
- `void_agent_receipts_lines_total`
- `void_agent_receipts_age_seconds`

This tracks the **global receipts.jsonl** file (not just devnet).

Under the hood, we **derive** devnet-specific metrics from the JSONL content
using dedicated devnet exporters.

### 4.2 Devnet receipts exporter

Script:

- `~/.local/bin/void-devnet-receipts-exporter.sh`

Service + timer:

- `~/.config/systemd/user/void-devnet-receipts-exporter.service`
- `~/.config/systemd/user/void-devnet-receipts-exporter.timer`

Input:

- `ops/devnet/receipts.jsonl` (current devnet receipts file)

Output textfile:

- `~/.cache/node-exporter-textfile/void_devnet_receipts.prom`
- Symlinked into `/var/lib/node_exporter/textfile_collector/void_devnet_receipts.prom`

Metrics:

- `void_devnet_receipts_total{chain="devnet"}`
- `void_devnet_receipts_model_total{chain="devnet",model="gpt-4.1-mini"}`

Prometheus recordings:

- `void:devnet:receipts_total`
- `void:devnet:receipts_total:delta_5m`
- `void:devnet:receipts_total_by_model` (vector, per `model` label)
- `void:devnet:receipts_coverage` (global coverage vs overall receipts)
- `void:devnet:jobs_receipt_coverage_by_model` (model-level coverage)

### 4.3 Devnet jobs exporter

A matching exporter (shell + Prom rules) derives:

- `void:devnet:jobs_total`
- `void:devnet:jobs_total:delta_5m`
- `void:devnet:jobs_without_receipts`
- `void:devnet:jobs_receipt_coverage`

And for each model:

- `void:devnet:jobs_total_by_model{model="..."}`
- `void:devnet:jobs_without_receipts_by_model{model="..."}`
- `void:devnet:jobs_receipt_coverage_by_model{model="..."}`

These are driven off **jobs.jsonl** and **receipts.jsonl** together.

### 4.4 Devnet contract health exporter

Script:

- `~/.local/bin/void-devnet-contract-health.sh`

Output textfile:

- `~/.cache/node-exporter-textfile/void_devnet_contracts.prom`
- Symlinked into `/var/lib/node_exporter/textfile_collector/void_devnet_contracts.prom`

Metrics:

- `void_devnet_contracts_healthy{chain="devnet"}`
- `void_devnet_modelregistry_admin_mismatch{chain="devnet"}`
- `void_devnet_jobqueue_admin_mismatch{chain="devnet"}`

Logic:

- Reads addresses from `docs/VOID-DEVNET-PROTOCOL-STATE.json`
- Calls:
  - `ModelRegistry.admin()`
  - `JobQueue.admin()`
- Compares both to `AdminGate`
- Emits mismatch gauges and a single “all good” gauge.

---

## 5. Prometheus recording rules

Recording rules (under `/etc/prometheus/void-devnet-rules.yml` and related
files) derive human-friendly metrics:

Global:

- `void:devnet:models:health`
- `void:devnet:models:admin_mismatch`
- `void:devnet:jobs_total`
- `void:devnet:receipts_total`
- `void:devnet:jobs_without_receipts`
- `void:devnet:jobs_receipt_coverage`
- `void_devnet_contracts_healthy`

Per-model:

- `void:devnet:jobs_total_by_model{model="..."}`
- `void:devnet:receipts_total_by_model{model="..."}`
- `void:devnet:jobs_without_receipts_by_model{model="..."}`
- `void:devnet:jobs_receipt_coverage_by_model{model="..."}`
- (and any future per-model splits we add)

These are the metrics you see from `~/.local/bin/void-devnet-status.sh`.

---

## 6. Alerts (without Grafana)

All alerts are pure Prometheus → Alertmanager. Grafana is **not required**.

### 6.1 ModelRegistry / Model admin alerts

Group: `void-devnet-alerts`

Alerts:

- `VoidDevnetModelsHealthBad`
  - `void:devnet:models:health != 1` for 5m
  - ModelRegistry devnet health is bad.

- `VoidDevnetModelsAdminMismatch`
  - `void:devnet:models:admin_mismatch > 0` for 5m
  - ModelRegistry admin mismatch vs AdminGate.

### 6.2 Global job/receipt alerts

Same group:

- `VoidDevnetJobsStuckNoReceipts`
  - `void:devnet:jobs_without_receipts > 0` for 10m
  - Jobs exist with no receipts at all.

- `VoidDevnetJobsCoverageLow`
  - `void:devnet:jobs_receipt_coverage < 0.8` for 15m
  - Receipts lagging behind jobs overall.

### 6.3 Per-model alerts

Group: `void-devnet-model-alerts`

Alerts:

- `VoidDevnetModelBacklog`
  - `void:devnet:jobs_without_receipts_by_model > 0` for 10m
  - A specific model has jobs with no receipts.

- `VoidDevnetModelCoverageLow`
  - `void:devnet:jobs_receipt_coverage_by_model < 0.8` for 15m
  - Receipts lagging behind jobs for a specific model.

These are already showing up as `pending` when we intentionally leave one
job without a receipt. When coverage goes back to 1 and the backlog drops
to 0, they resolve.

### 6.4 Contract health alert

Group: `void-devnet-contracts-alerts`

Alert:

- `VoidDevnetContractsHealthBad`
  - `void_devnet_contracts_healthy != 1` for 5m
  - Something is wrong with AdminGate / ModelRegistry / JobQueue admin wiring.

---

## 7. Status script

Helper:

- `~/.local/bin/void-devnet-status.sh`

Behavior:

- Queries Prometheus for:
  - `void:devnet:models:health`
  - `void:devnet:models:admin_mismatch`
  - `void:devnet:jobs_total`
  - `void:devnet:receipts_total`
  - `void:devnet:jobs_without_receipts`
  - `void:devnet:jobs_receipt_coverage`
  - `void:devnet:jobs_total_by_model`
  - `void:devnet:receipts_total_by_model`
  - `void:devnet:jobs_without_receipts_by_model`
  - `void:devnet:jobs_receipt_coverage_by_model`
  - `void_devnet_contracts_healthy`
  - `void_devnet_modelregistry_admin_mismatch`
  - `void_devnet_jobqueue_admin_mismatch`
- Prints a compact JSON summary (the blocks you’ve been pasting).

When everything is green, we expect:

- `models:health == 1`
- `models:admin_mismatch == 0`
- `jobs_without_receipts == 0`
- `jobs_receipt_coverage == 1`
- per-model coverage == 1
- `void_devnet_contracts_healthy == 1`
- devnet admin mismatches == 0

---

## 8. How this maps to future Obelisk Agents

Right now:

- Jobs and receipts are **devnet-only** and live in JSONL files.
- On-chain `JobQueue` is deployed, but we don’t push every devnet job into it.
- The “agent” is a shell script simulator, not a real Obelisk Agent.

Later (mainnet-ish):

1. Obelisk Wallet / Obelisk Agent will:
   - Post jobs on-chain via `JobQueue`.
   - Read jobs (via logs or RPC).
   - Execute AI work (OpenAI, local, or VOID-native models).
   - Post receipts somewhere verifiable (on-chain `ReceiptRegistry` or
     at least off-chain with signed commitments).

2. Prometheus will:
   - Track real on-chain job counts and statuses.
   - Track per-agent performance and coverage.
   - Keep the same style of metrics and alerts (backlog, coverage, admin
     mismatches), but pointed at production endpoints.

Devnet’s current pipeline is the **template** for that mainnet behavior:
minimal contracts, JSONL + exporters, and strict metrics/alerts.

---

## 9. Current status (snapshot)

At the point this doc was written, a healthy devnet looks like:

- `void:devnet:models:health == 1`
- `void:devnet:models:admin_mismatch == 0`
- `void:devnet:jobs_total == 4`
- `void:devnet:receipts_total == 7`
- `void:devnet:jobs_without_receipts == 0`
- `void:devnet:jobs_receipt_coverage == 1`
- `void:devnet:jobs_total_by_model{model="gpt-4.1-mini"} == 4`
- `void:devnet:receipts_total_by_model{model="gpt-4.1-mini"} == 7`
- `void:devnet:jobs_without_receipts_by_model{model="gpt-4.1-mini"} == 0`
- `void:devnet:jobs_receipt_coverage_by_model{model="gpt-4.1-mini"} == 1`
- `void_devnet_contracts_healthy == 1`
- both devnet admin mismatch gauges == 0

This doc is the authoritative description of devnet jobs/agents behavior
until we explicitly rev it.
