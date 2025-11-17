# VOID Devnet – AI Agent & Receipt Stack (v0)

This doc describes how the VOID devnet AI stack is wired today:

- On-chain control (AdminGate, ModelRegistry, JobQueue).
- Off-chain job + receipt logs (JSONL files).
- Monitoring via Prometheus + textfile exporters.

It’s the canonical map for how agents, jobs, and receipts hang together on devnet.

---

## 1. Core devnet contracts (chainId 2050)

As of this snapshot, devnet is using:

- AdminGate
  AdminGate = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

- ModelRegistry
  ModelRegistry = 0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf

- JobQueue
  JobQueue = 0x851356ae760d987E095750cCeb3bC6014560891C

These come from:

- docs/VOID-DEVNET-PROTOCOL-STATE.json
- Cross-checked with cast calls and the devnet contract health exporter.

### 1.1 Admin relationships

- ModelRegistry.admin() = AdminGate
- JobQueue.admin()     = AdminGate

The devnet contract health script (void-devnet-contract-health.sh) verifies:

- void_devnet_modelregistry_admin_mismatch{chain="devnet"} == 0
- void_devnet_jobqueue_admin_mismatch{chain="devnet"} == 0
- void_devnet_contracts_healthy{chain="devnet"} == 1

This guarantees one master control point (AdminGate) for protocol-level AI config on devnet.

When we go to mainnet, we keep the same pattern:

- New mainnet addresses go into a mainnet state file.
- All exporters and alerts read from that file (no hard-coded addresses in scripts).

---

## 2. Job + receipt flow on devnet (today)

Right now devnet uses a hybrid approach:

- Jobs are modeled on-chain via JobQueue (conceptually).
- Jobs and receipts are tracked off-chain via JSONL logs.
- Monitoring is driven by Prometheus metrics derived from those logs.

### 2.1 Off-chain log files

Current dev paths:

- Jobs JSONL:
  ops/devnet/jobs.jsonl

- Receipts JSONL:
  ops/devnet/receipts.jsonl
  plus historical snapshots like data_fresh_*/agent/receipts.jsonl for coverage testing.

Each line is one JSON record, for example:

Job (example):

  {"chainId":2050,"jobId":"0xjob-devnet-1763314469","status":"posted","modelId":"gpt-4.1-mini","postedBy":"0x0000000000000000000000000000000000000000","agentHint":"obelisk-devnet-manual-1","createdAt":1763314469}

Receipt (example):

  {"chainId":2050,"jobId":"0xjob-devnet-1763314469","receiptId":"0xrcpt1","status":"completed","modelId":"gpt-4.1-mini","postedBy":"0x111","agent":"obelisk-devnet-agent-1","receiptTs":1763315728124}

### 2.2 Agent simulator

Devnet includes a fake agent that:

- Reads jobs from ops/devnet/jobs.jsonl.
- Emulates an agent completing them.
- Appends receipts to ops/devnet/receipts.jsonl.

Systemd units:

- Service: void-devnet-agent-sim.service
  - Runs ~/.local/bin/void-devnet-agent-sim.sh
  - Environment:
    - JOBS_FILE=%h/dev/void-node/ops/devnet/jobs.jsonl
    - RECEIPTS_FILE=%h/dev/void-node/ops/devnet/receipts.jsonl

- Timer: void-devnet-agent-sim.timer
  - OnBootSec=20
  - OnUnitActiveSec=30
  - Keeps devnet receipts catching up with jobs.

Additionally, void-devnet-agent-repair.sh can backfill receipts if we import jobs from an older snapshot.

---

## 3. Devnet metrics: jobs and receipts (global)

Prometheus metrics are derived from the JSONL logs via node_exporter textfile collectors.

Key series (global, all models):

- void:devnet:jobs_total
  Total jobs recorded on devnet.

- void:devnet:receipts_total
  Total receipts recorded on devnet.

- void:devnet:jobs_without_receipts
  jobs_total - receipts_total, clamped at >= 0.

- void:devnet:jobs_receipt_coverage
  Ratio of receipts to jobs, roughly:
  - 1.0 = all jobs have receipts
  - < 1.0 = some jobs missing receipts

These are computed from raw textfile metrics like:

- void_devnet_jobs_total{chain="devnet"}
- void_devnet_receipts_total{chain="devnet"}

and exposed via recording rules in void-devnet-rules.yml.

Example state you observed (illustrative):

- void:devnet:jobs_total            = 4
- void:devnet:receipts_total        = 7
- void:devnet:jobs_without_receipts = 0
- void:devnet:jobs_receipt_coverage = 1.0

---

## 4. Devnet metrics: by model

The pipeline also breaks things down per modelId (for example, gpt-4.1-mini):

- void:devnet:jobs_total_by_model{model="gpt-4.1-mini"}
- void:devnet:receipts_total_by_model{model="gpt-4.1-mini"}
- void:devnet:jobs_without_receipts_by_model{model="gpt-4.1-mini"}
- void:devnet:jobs_receipt_coverage_by_model{model="gpt-4.1-mini"}

This lets us see per-model backlogs and coverage.

Example of a healthy state:

- void:devnet:jobs_total_by_model{model="gpt-4.1-mini"}              = 4
- void:devnet:receipts_total_by_model{model="gpt-4.1-mini"}          = 7
- void:devnet:jobs_without_receipts_by_model{model="gpt-4.1-mini"}   = 0
- void:devnet:jobs_receipt_coverage_by_model{model="gpt-4.1-mini"}   = 1.0

---

## 5. Devnet contract health metrics

Textfile exporter: void-devnet-contract-health.sh

- Writes:
  ~/.cache/node-exporter-textfile/void_devnet_contracts.prom
- Then symlinked into node_exporter’s textfile dir.

Metrics:

- void_devnet_modelregistry_admin_mismatch{chain="devnet"}
  0 = ModelRegistry.admin matches AdminGate
  1 = mismatch

- void_devnet_jobqueue_admin_mismatch{chain="devnet"}
  0 = JobQueue.admin matches AdminGate
  1 = mismatch

- void_devnet_contracts_healthy{chain="devnet"}
  1 = all contract admin checks passed
  0 = something failed (mismatch or call error)

Example healthy state:

- void_devnet_contracts_healthy{chain="devnet"}            = 1
- void_devnet_modelregistry_admin_mismatch{chain="devnet"} = 0
- void_devnet_jobqueue_admin_mismatch{chain="devnet"}      = 0

---

## 6. Devnet alerts (Prometheus)

Alert files currently in /etc/prometheus/alerts/:

### 6.1 Global devnet alerts (void-devnet-alerts.yml)

Rules:

1) VoidDevnetModelsHealthBad
   - Expr: void:devnet:models:health != 1
   - Duration: 5m
   - Meaning: ModelRegistry health or admin mismatch is bad.

2) VoidDevnetModelsAdminMismatch
   - Expr: void:devnet:models:admin_mismatch > 0
   - Duration: 5m
   - Meaning: ModelRegistry.admin no longer matches AdminGate.

3) VoidDevnetJobsStuckNoReceipts
   - Expr: void:devnet:jobs_without_receipts > 0
   - Duration: 10m
   - Meaning: There are devnet jobs that have no receipts for at least 10 minutes.

4) VoidDevnetJobsCoverageLow
   - Expr: void:devnet:jobs_receipt_coverage < 0.8
   - Duration: 15m
   - Meaning: Receipts are lagging behind jobs overall (coverage < 80 percent).

### 6.2 Per-model devnet alerts (void-devnet-model-alerts.yml)

Rules:

1) VoidDevnetModelBacklog
   - Expr: void:devnet:jobs_without_receipts_by_model > 0
   - Duration: 10m
   - Labels: includes model="<modelId>".
   - Meaning: Specific model has a backlog of jobs with no receipts.

2) VoidDevnetModelCoverageLow
   - Expr: void:devnet:jobs_receipt_coverage_by_model < 0.8
   - Duration: 15m
   - Meaning: For this model, receipts lag behind jobs (coverage < 80 percent) for 15 minutes.

### 6.3 Devnet contracts alerts (void-devnet-contracts-alerts.yml)

Rule:

- VoidDevnetContractsHealthBad
  - Expr: void_devnet_contracts_healthy != 1
  - Duration: 5m
  - Meaning: One of the devnet contract checks failed (admin mismatch or call failure).

---

## 7. How this scales to mainnet

The pattern we are locking in:

1) State file as source of truth

- Devnet uses docs/VOID-DEVNET-PROTOCOL-STATE.json for AdminGate, ModelRegistry, JobQueue, etc.
- Mainnet will use a mainnet state file with the same shape (chainId 2050, new addresses).
- Exporters and scripts always read from the state file, never hard-code addresses.

2) Same contracts, different addresses

- Admin relationships (AdminGate to ModelRegistry, JobQueue, AgentRegistry, ReceiptRegistry, ConfigGate, DatasetRegistry, JobReceipts) remain the same.
- Only the address values differ between devnet and mainnet.

3) Same metrics and alerts

- The metric names are devnet-flavored today, but the structure is reusable:
  - void:<network>:jobs_total
  - void:<network>:jobs_receipt_coverage
  - void_<network>_contracts_healthy
- For mainnet, we will mirror the rule groups with a different component or chain label.

4) Future on-chain receipts

- Today, devnet receipts live in JSONL plus textfile metrics.
- Later, we will introduce ReceiptRegistry or JobReceipts on-chain and:
  - Export on-chain counts and coverage.
  - Keep the same metric and alert structure; swap the backend from JSONL to contract calls or events.

---

## 8. Next steps

This doc is a snapshot of v0 devnet AI stack. Planned upgrades:

1) Devnet deployment and monitoring for:
   - AgentRegistry
   - ReceiptRegistry or JobReceipts

2) Mainnet-style receipts:
   - On-chain backing for receipts and coverage.

3) Eval and dataset registries:
   - ModelEvalRegistry and DatasetRegistry for model and dataset metadata and provenance.

4) Wallet and agent integration:
   - Obelisk Wallet and off-chain agent services using this stack as the canonical source of truth.

