# VOID Network – JobQueue & ReceiptRegistry Spec (v1, mainnet-oriented)

Status: draft-v1, aligned with devnet 2025-11-20  
Scope: JobQueue + ReceiptRegistry contracts that drive AI jobs on VOID (chainId 2050)

This spec defines **what must be true on-chain** for jobs and receipts:

- How jobs are posted and tracked (JobQueue).
- How receipts are recorded (ReceiptRegistry).
- What invariants monitoring relies on.

It is **not** a full ABI dump; it’s the behavioral contract nodes and agents
depend on.

---

## 1. Roles & Concepts

### 1.1 JobQueue

JobQueue is the on-chain registry of AI jobs.

Each job is identified by a `bytes32 jobId` and has core fields:

- `jobId` – unique identifier (typically a hash of posting params).
- `appId` / `tag` – free-form string identifiers for the app / use-case.
- `requester` – `address` that posted the job (payer / owner).
- `payloadHash` – `bytes32` hash of the off-chain payload or CID.
- `modelKey` – string or bytes tag for the requested model (e.g. `gpt-4.1-mini`).
- `createdAt` – unix timestamp or block-based time.
- `status` – small integer enum, see below.
- `hasResult` – boolean indicating whether at least one receipt exists.

(Names/types may vary in Solidity; behavior MUST match this spec.)

### 1.2 ReceiptRegistry

ReceiptRegistry tracks **off-chain work results** for jobs.

Each receipt is identified by a `bytes32 receiptId` and has core fields:

- `receiptId` – unique identifier (e.g. hash of jobId + agent + payload).
- `jobId` – `bytes32` referencing the JobQueue entry.
- `agent` – `address` of the agent/worker that produced this receipt.
- `resultHash` – `bytes32` hash of the off-chain result or CID.
- `status` – result status code (e.g. success / error / partial).
- `createdAt` – unix timestamp or block-based time.

Multiple receipts per job are allowed (e.g. retries, multiple agents, or
multi-step workflows). Monitoring treats **“>= 1 receipt per job”** as
coverage.

---

## 2. Job Status Semantics

JobQueue uses a small integer status enum. At minimum:

- `0` – **Unknown / Not set** (implementation detail; SHOULD NOT be returned for a valid job).
- `1` – **Posted**: job exists, has not been finalized.
- `2` – **Done**: job has at least one valid receipt; from JobQueue’s POV it is “completed”.
- `>=3` – **Extended states** (e.g. Cancelled, Expired, Failed, Disputed, etc.).

Mainnet requirement:

- Status **must be monotonic**: it may move from lower -> higher severity
  / finality, but never backwards (e.g. `Done -> Posted` is forbidden).

---

## 3. Core Invariants (MUST HOLD)

Let:

- `J = totalJobs()` – total number of jobs ever posted.
- `R = totalReceipts()` – total number of receipts ever written.
- For a given job `jobId`:
  - `r(jobId) = receiptCount(jobId)` – how many receipts refer to that job.
  - `hasResult(jobId) = JobQueue.hasResult(jobId)`.
  - `status(jobId) = JobQueue.getJobStatus(jobId)`.

### 3.1 Monotonic counts

- `J` and `R` MUST be **monotonic non-decreasing** over time.
- Deleting or reusing ids is forbidden on mainnet.
- Any “reset” or pruning must be done on devnets only.

### 3.2 Coverage invariant

For every job that exists:

- If `r(jobId) == 0`:
  - `hasResult(jobId)` **MUST** be `false`.
  - `status(jobId)` **MUST NOT** be `Done` (2). It SHOULD be `Posted` (1) or
    another non-final state (e.g. Cancelled, Expired).

- If `r(jobId) >= 1`:
  - `hasResult(jobId)` **MUST** be `true`.
  - `status(jobId)` **MUST** be a final or at-least-“has-results” state such as
    `Done` (2) or a future extended state that semantically means “completed
    with results”.
  - `status(jobId) == Posted` (1) while `r(jobId) >= 1` is forbidden.

This is the invariant that devnet coverage gauges are checking:

- `void_devnet_coverage == 1` iff every job has `r(jobId) >= 1`.
- `void_devnet_coverage_health == 1` iff coverage is complete.
- `void_devnet_receipts_health_v2 == 1` iff `R >= J`.

### 3.3 Multi-receipt behavior

Mainnet allows multiple receipts per job:

- Receipts MUST be **append-only**; an existing `receiptId` cannot be mutated.
- For a fixed `jobId`, the sequence of receipts:
  - MAY represent retries or different agents.
  - MUST always reference the same `jobId`.
- Monitoring is allowed to:
  - Treat `r(jobId) >= 1` as “covered”.
  - Track additional stats (e.g. receipts/job, per-agent receipts, errors).

The current devnet behavior (`R >> J` and `coverage == 1`) is acceptable and
expected for stress tests.

---

## 4. Observability Contract

The following metrics represent the source of truth for devnet and are the
shape we will preserve into mainnet (with network/env labels).

### 4.1 Coverage (v1 historic flags; diagnostic only)

Exporter: `ops/void-devnet-jobs-status-exporter.sh`  
Textfile: `/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v1.prom`

Metrics:

- `void_devnet_jobs_status_v1_total` – jobs in spool (historic).
- `void_devnet_jobs_status_v1_chain_total` – `totalJobs()` from JobQueue.
- `void_devnet_jobs_status_v1_receipts_total` – `totalReceipts()` from ReceiptRegistry.
- `void_devnet_jobs_status_v1_posted` – jobs with `status == 1`.
- `void_devnet_jobs_status_v1_done` – jobs with `status == 2`.
- `void_devnet_jobs_status_v1_other` – jobs with other status codes.
- `void_devnet_jobs_status_v1_bad_flags` – jobs where `hasResult` / `status`
  are inconsistent with receipts (e.g. `r(jobId) >= 1` but `hasResult == false`).
- `void_devnet_jobs_status_v1_health` – `1` if spool and chain agree on counts,
  else `0`.

Recording rules:

- `void:devnet_jobs_status_v1:health` – min over `void_devnet_jobs_status_v1_health`.
- `void:devnet_jobs_status_v1:bad_flags` – max over `void_devnet_jobs_status_v1_bad_flags`.
- `void:devnet_jobs_status_v1:total` – max over `void_devnet_jobs_status_v1_total`.

Mainnet stance:

- v1 metrics are **diagnostic only** and MUST NOT gate devnet/mainnet health.
- We accept historic warts (non-zero `bad_flags`) on devnet.
- Mainnet SHOULD be run with `bad_flags == 0` as an operational target.

### 4.2 Coverage (v2 canonical)

Exporter: `ops/void-devnet-coverage-exporter.sh` (and related helpers)  
Textfile: `/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom`

Key metrics:

- `void_devnet_coverage` – fraction of jobs with `r(jobId) >= 1`, 0..1.
- `void_devnet_coverage_health` – `1` when coverage == 1, else 0.
- `void_devnet_jobs_total` / `void_devnet_jobs_total_v2` – total jobs.
- `void_devnet_receipts_total` / `void_devnet_receipts_total_v2` – total receipts.
- `void_devnet_receipts_coverage_v2` – `R / J` ratio.
- `void_devnet_receipts_health_v2` – `1` when `R >= J`, else 0.
- Smoothed recordings over 5 minutes:
  - `void:devnet_coverage_v2:last_5m`
  - `void:devnet_receipts_health_v2:5m`

Operational rule:

- Devnet/mainnet health requires:
  - `void_devnet_coverage_health == 1`
  - `void_devnet_receipts_health_v2 == 1`

These are already wired into `void-devnet-health-all.sh` and the overall
Prometheus `void_devnet_overall_health` gauge.

---

## 5. Devnet vs Mainnet Expectations

### 5.1 Devnet

Devnet is allowed to:

- Accumulate historic anomalies in v1 metrics (non-zero `bad_flags`).
- Stress-test with high receipts/job ratios.
- Run extra diag exporters and experimental invariants.

Devnet MUST:

- Keep v2 coverage gauges green (`coverage_health == 1`,
  `receipts_health_v2 == 1`) before declaring the environment “healthy”.

### 5.2 Mainnet

Mainnet SHOULD:

- Deploy JobQueue + ReceiptRegistry implementations that:
  - Enforce the coverage invariants in section 3.
  - Keep `bad_flags == 0` in normal operation.
- Treat any violation of the coverage invariants as **operator alerts**
  (potential contract bug or misconfiguration).
- Persist coverage and health metrics with chain/network labels and
  integrate them into global VOID health dashboards.

---

## 6. Next Steps (Implementation TODOs)

- [ ] Ensure JobQueue sets `hasResult(jobId) = true` as soon as a receipt is
      written for that job, and never clears it.
- [ ] Ensure JobQueue status transitions never regress (e.g. `Done` -> `Posted`).
- [ ] Add explicit coverage invariants to the devnet tests (Forge / Foundry):
      for a test harness posting jobs and writing receipts, assert that
      invariants in §3 always hold.
- [ ] Optionally add per-agent metrics (receipts per agent) on devnet, to
      build toward agent reputation and slashing on mainnet.

