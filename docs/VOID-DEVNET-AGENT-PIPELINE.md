# VOID Devnet – Agent + Job + Receipt Pipeline (v1)

This doc snapshots how VOID devnet currently wires **AI jobs** and **receipts**
around the core governance contracts.

It covers:

- On-chain: `AdminGate`, `ModelRegistry`, `JobQueue`
- Off-chain: devnet jobs/receipts JSONL + agent simulator
- Observability: Prometheus metrics + alerts
- Future: `AgentRegistry`, `ReceiptRegistry`, `ModelEvalRegistry`, `DatasetRegistry`

---

## 1. On-chain contracts (devnet)

Chain: **VOID devnet (chainId 2050)**

From `docs/VOID-DEVNET-PROTOCOL-STATE.json`:

- **AdminGate**
  - Address: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
  - Role: master-key controlled governance root.
  - Expected to own / admin other protocol contracts (via `admin()`).

- **ModelRegistry**
  - Address: `0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf`
  - Contract: `contracts/ModelRegistry.sol`
  - Admin: `AdminGate` (verified with `cast call admin()`).
  - Purpose: registry of **AI model IDs** and metadata (hash, URI, owner, active flag).

- **JobQueue**
  - Address: `0x851356ae760d987E095750cCeb3bC6014560891C`
  - Contract: `contracts/JobQueue.sol`
  - Admin: `AdminGate` (verified with `cast call admin()`).
  - Purpose: on-chain registry of **AI jobs**:
    - who posted
    - model ID requested
    - payload hash / URI
    - lifecycle status (posted, claimed, completed, cancelled, etc.)

These are all controlled by **AdminGate** on devnet and are wired into our
off-chain pipeline via **JSONL logs + exporters**.

---

## 2. Off-chain devnet files & scripts

Working dir:

- Repo: `~/dev/void-node`
- Devnet ops dir: `ops/devnet/`

### 2.1 JSONL logs

- **Jobs log**
  - Path: `ops/devnet/jobs.jsonl`
  - Format: one JSON job per line, e.g.:

    ```json
    {
      "chainId": 2050,
      "jobId": "0xjob-devnet-1763314469",
      "status": "posted",
      "modelId": "gpt-4.1-mini",
      "postedBy": "0x0000000000000000000000000000000000000000",
      "agentHint": "obelisk-devnet-manual-1",
      "createdAt": 1763314469
    }
    ```

- **Receipts log**
  - Path: `ops/devnet/receipts.jsonl`
  - Format: one JSON receipt per line, e.g.:

    ```json
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
    ```

These files are the **off-chain mirror** of what on-chain JobQueue and future
ReceiptRegistry will see.

### 2.2 Devnet helper scripts

Installed under `~/.local/bin/` (devnet only):

- `void-devnet-mk-job.sh`
  - Creates a **synthetic devnet job** and appends it to `ops/devnet/jobs.jsonl`.
  - Used for smoke tests.

- `void-devnet-agent-sim.sh`
  - Reads jobs from `ops/devnet/jobs.jsonl`
  - Adds receipts into `ops/devnet/receipts.jsonl` for jobs that are missing them.
  - Acts as a **fake Obelisk agent** for devnet.

- `void-devnet-receipts-exporter.sh`
  - Reads `ops/devnet/receipts.jsonl`
  - Emits Prometheus **textfile** metrics:
    - totals
    - per-model counts

- `void-devnet-jobs-exporter.sh` (naming may differ, but conceptually):
  - Reads both `jobs.jsonl` and `receipts.jsonl`
  - Computes:
    - jobs with missing receipts
    - coverage ratios
    - per-model breakdowns

- `void-devnet-status.sh`
  - Calls Prometheus for the main devnet metrics and prints them as JSON.
  - Quick CLI health snapshot for:
    - models health/admin mismatch
    - jobs/receipts totals and coverage
    - per-model stats
    - devnet contracts health gauges.

- `void-devnet-contract-health.sh`
  - Uses `cast` to call `admin()` on:
    - `ModelRegistry`
    - `JobQueue`
  - Compares each to `AdminGate`.
  - Writes textfile metrics like:
    - `void_devnet_modelregistry_admin_mismatch`
    - `void_devnet_jobqueue_admin_mismatch`
    - `void_devnet_contracts_healthy`

---

## 3. Systemd + exporters (devnet)

Devnet uses **systemd user services + timers** to keep the simulated agent
world ticking:

- `void-devnet-receipts-exporter.service` / `.timer`
  - Runs `void-devnet-receipts-exporter.sh`.
  - Writes `void_devnet_receipts.prom` into the node_exporter textfile dir.

- `void-devnet-agent-sim.service` / `.timer`
  - Periodically runs `void-devnet-agent-sim.sh`.
  - Ensures jobs gain receipts over time for smoke tests.

Textfile metrics are symlinked into:

- `/var/lib/node_exporter/textfile_collector/*.prom`

and then scraped by node_exporter → Prometheus.

---

## 4. Prometheus metrics (devnet)

We expose two main **namespaces**:

1. **Raw devnet textfile metrics**  
   From node_exporter, e.g.:

   - `void_devnet_receipts_total{chain="devnet"}`
   - `void_devnet_receipts_model_total{chain="devnet",model="gpt-4.1-mini"}`
   - `void_devnet_contracts_healthy{chain="devnet"}`
   - `void_devnet_modelregistry_admin_mismatch{chain="devnet"}`
   - `void_devnet_jobqueue_admin_mismatch{chain="devnet"}`

2. **Derived devnet recordings**  
   Prometheus `record` rules compute:

   - `void:devnet:receipts_total`
   - `void:devnet:receipts_total_by_model{model="gpt-4.1-mini"}`
   - `void:devnet:jobs_total`
   - `void:devnet:jobs_total_by_model{model="gpt-4.1-mini"}`
   - `void:devnet:jobs_without_receipts`
   - `void:devnet:jobs_without_receipts_by_model{model="gpt-4.1-mini"}`
   - `void:devnet:jobs_receipt_coverage`
   - `void:devnet:jobs_receipt_coverage_by_model{model="gpt-4.1-mini"}`
   - `void:devnet:models:health`
   - `void:devnet:models:admin_mismatch`

These are what `~/.local/bin/void-devnet-status.sh` reads and prints.

---

## 5. Devnet alerts

We have several **alert groups** wired for VOID devnet:

### 5.1 Model / ModelRegistry alerts

Group: `void-devnet-alerts`:

- `VoidDevnetModelsHealthBad`
  - Fires if `void:devnet:models:health != 1` for 5m.

- `VoidDevnetModelsAdminMismatch`
  - Fires if `void:devnet:models:admin_mismatch > 0` for 5m.

### 5.2 Job coverage alerts

Same group, for global coverage:

- `VoidDevnetJobsStuckNoReceipts`
  - Fires if `void:devnet:jobs_without_receipts > 0` for 10m.

- `VoidDevnetJobsCoverageLow`
  - Fires if `void:devnet:jobs_receipt_coverage < 0.8` for 15m.

### 5.3 Per-model alerts

Group: `void-devnet-model-alerts`:

- `VoidDevnetModelBacklog`
  - Condition: `void:devnet:jobs_without_receipts_by_model > 0` for 10m.

- `VoidDevnetModelCoverageLow`
  - Condition: `void:devnet:jobs_receipt_coverage_by_model < 0.8` for 15m.

### 5.4 Contract health alert

Group: `void-devnet-contracts-alerts`:

- `VoidDevnetContractsHealthBad`
  - Condition: `void_devnet_contracts_healthy != 1` for 5m.
  - Indicates:
    - ModelRegistry.admin or JobQueue.admin != AdminGate, or
    - cast `admin()` calls are failing (e.g., contract replaced or misconfigured).

---

## 6. Where this is heading (next steps)

This devnet slice proves:

- AdminGate, ModelRegistry, JobQueue are wired with a **single admin root**.
- Off-chain jobs + receipts can be:
  - Logged (`jobs.jsonl`, `receipts.jsonl`)
  - Simulated (agent sim)
  - Measured (Prometheus metrics + coverage)
  - Alerted on (backlog & coverage alerts, per-model).

Next steps for VOID Network, building on this:

1. **Deploy and wire `AgentRegistry` + `ReceiptRegistry` on devnet**
   - Admin = `AdminGate`
   - ChainId = 2050
   - Hook them into:
     - future Obelisk agents
     - future on-chain audits of receipts.

2. **Extend exporters**
   - Read from real on-chain AgentRegistry / ReceiptRegistry instead of only JSONL.
   - Keep JSONL as the “off-chain ground truth” for agent processing.

3. **Integrate ModelEval & Dataset registries (later phase)**
   - ModelEvalRegistry: store evaluation runs, scores, and hashes.
   - DatasetRegistry: track datasets, owners, licenses, and hashes.

4. **Obelisk Wallet devnet agent**
   - Replace the simple `void-devnet-agent-sim.sh` with a real Obelisk Agent that:
     - Reads JobQueue on-chain
     - Fetches payloads from VOID storage
     - Runs models
     - Writes receipts on-chain (ReceiptRegistry) and off-chain (JSONL)
     - Updates metrics.

This document is the **canonical devnet spec** for the current agent/job/receipt
pipeline. When we evolve the contracts or exporters, this file should be updated
to match and tagged alongside protocol changes.

