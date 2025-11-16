# VOID Network – JobQueue Agent Receipts (v0)

This file defines the **off-chain receipt format** that VOID agents must emit
for jobs tracked by the on-chain `JobQueue` contract on VOID (chainId 2050).

The goals:

- Tie **on-chain jobs** (JobQueue) to **off-chain AI work**.
- Make coverage measurable: every finished job should have **at least one**
  corresponding agent receipt.
- Keep it **simple, append-only, JSON** so it works with the existing
  receipts.jsonl + Prometheus exporters you already have.

---

## 1. Receipt Object (AgentReceipt v0)

Each receipt is a single JSON object, one per line in `receipts.jsonl`, and
also the unit payload for `POST /agent/v0/receipt`.

### 1.1 Required top-level fields

- `version` (string)  
  Always `"v0"` for this spec.

- `chainId` (number)  
  EVM chain id where the job lives.  
  For VOID devnet: `2050`.

- `jobqueue` (string, hex address)  
  `JobQueue` contract address, e.g. `"0x5FbDB2...80aa3"`.

- `jobId` (number)  
  The `uint256` job id from `JobQueue`.

- `poster` (string, hex address)  
  Copied from `jobs(jobId).poster`.

- `agent` (string, hex address)  
  The address that **actually ran** the job off-chain.  
  SHOULD match `jobs(jobId).agent` once `claimJob` / `completeJob` are done.

- `status` (string)  
  One of: `"pending"`, `"claimed"`, `"done"`, `"failed"`, `"cancelled"`.  
  SHOULD match the on-chain `Status` at the time the receipt was written.

- `resultHash` (string, hex32)  
  Same `bytes32` provided to `completeJob` on-chain.

- `resultURI` (string)  
  Same URI string given to `completeJob`.  
  Example: `"void://devnet/job/1/result-1"`.

- `txHashComplete` (string, hex32)  
  Tx hash that called `completeJob` (can be empty for in-flight jobs).

- `success` (boolean)  
  True if the off-chain run is considered successful.

- `createdAt` (number)  
  Unix timestamp (seconds) when the agent first saw / created the job.

- `completedAt` (number)  
  Unix timestamp (seconds) when the agent finished and wrote the receipt.

### 1.2 Required job meta fields

These mirror the on-chain `bytes32` fields (`app`, `channel`, `kind`, `msgId`)
but are stored as human-readable strings in the receipt. The agent is
responsible for keeping them consistent with the on-chain hashes:

- `app` (string)       – e.g. `"nullfeed"`.
- `channel` (string)   – e.g. `"#general"`.
- `kind` (string)      – e.g. `"summarize"`, `"classify"`.
- `msgId` (string)     – app-specific message id (e.g. NullFeed post id).

### 1.3 Required model info fields

- `modelId` (string)  
  Logical model id, e.g. `"gpt-4.1-mini"`.

- `modelHash` (string)  
  Hash or version id for the exact model build used to run the job,
  e.g. `"sha256:...actual-model-hash..."`.

---

## 2. Optional fields

Agents MAY include these to make observability and billing nicer:

- `txHashClaim` (string | null)  
  Transaction hash that called `claimJob` (if used).

- `attempt` (number)  
  Retry counter for this job (1 = first attempt).

- `inputBytes` (number)  
  Approximate size of input payload processed by the model.

- `outputBytes` (number)  
  Approximate size of output produced by the model.

- `latencyMs` (number)  
  End-to-end latency in milliseconds for the off-chain run.

- `costVoid` (string)  
  Cost charged for this job in VOID (human-readable decimal string).

- `metadata` (object)  
  Freeform bag for app-specific details.  
  Example keys (for NullFeed): `"nullfeedPostId"`, `"threadId"`, etc.

---

## 3. Guarantees & expectations

- Every on-chain **completed** job SHOULD eventually have at least one
  corresponding `AgentReceipt v0` in `receipts.jsonl`.
- Receipts are **append-only**; agents do not edit old lines, they write new
  ones if they retry or correct something.
- Prometheus exporters for VOID will treat each line as one receipt and
  derive coverage / freshness metrics from the fields above.
