# VOID Network – JobReceipts Contract Spec (v1, minimal)

JobReceipts is the **on-chain record of which agent handled which job** and
what receipt/output hash they committed to.

- It does NOT store full outputs (only hashes/URIs/metadata).
- It does NOT enforce payment or staking in v1.
- It does NOT create jobs – it references JobQueue.

JobReceipts connects:

- `jobId` (from JobQueue)
- `agentId` (from AgentRegistry)
- `status` (claimed/completed/etc.)
- `receiptHash` / `outputHash` / `metadata`

so that off-chain infra and verifiers can see which agent did what.

---

## 1. Responsibilities

JobReceipts must:

- Allow an agent to **claim** a job.
- Allow an agent to **complete** a job with a receipt.
- Store a minimal record of outcome for each job.
- Emit events for claims and completions.
- Make it easy to query job → receipt and agent → jobs (via events).

JobReceipts cannot:

- Guarantee that the job was actually executed correctly.
- Enforce payment or economics (that is for other contracts).
- Force agents to pick up jobs.

---

## 2. Data model

### 2.1. Types

- `JobId` – `uint256` (from JobQueue)
- `AgentId` – string (from AgentRegistry)
- `Status` – `uint8`:
  - `0 = None` (no record)
  - `1 = Claimed`
  - `2 = Completed`
  - `3 = Failed`
  - `4 = Cancelled`
- `ReceiptHash` – `bytes32` (hash of an off-chain receipt document)
- `OutputHash` – `bytes32` (hash of primary output or bundle)
- `Metadata` – string (JSON, small)

### 2.2. Storage (conceptual)

Global:

- `jobQueue: address` (JobQueue contract)
- `agentRegistry: address` (AgentRegistry contract)
- `admin: address` or AdminGate reference

Per `jobId`:

- `hasRecord: bool`
- `agentId: string`
- `agentRuntime: address`
- `status: uint8`
- `receiptHash: bytes32`
- `outputHash: bytes32`
- `metadata: string`
- `claimedAt: uint64`
- `completedAt: uint64`

(Any indexing by agent should be done off-chain via events.)

---

## 3. Core functions

### 3.1. claimJob

Signature (conceptual):

- `claimJob(uint256 jobId, string agentId)`

Rules:

- Require:
  - `hasRecord[jobId] == false` in v1 (no prior record).
  - JobQueue says job exists: e.g. `jobId < JobQueue.nextJobId()`.
  - AgentRegistry says:
    - `isAgentActive(agentId) == true`
    - `getAgentRuntime(agentId) == msg.sender`
- Effects:
  - `hasRecord[jobId] = true`
  - `agentId[jobId] = agentId`
  - `agentRuntime[jobId] = msg.sender`
  - `status[jobId] = 1` (Claimed)
  - `claimedAt[jobId] = block.timestamp`
- Emit `JobClaimed`.

### 3.2. completeJob

Signature (conceptual):

- `completeJob(uint256 jobId, uint8 statusCode, bytes32 receiptHash, bytes32 outputHash, string metadata)`

Rules:

- `statusCode` must be:
  - `2 = Completed`
  - `3 = Failed`
- Require:
  - `hasRecord[jobId] == true`
  - `status[jobId] == 1` (Claimed)
  - `msg.sender == agentRuntime[jobId]`
  - `statusCode == 2 || statusCode == 3`
- Effects:
  - `status[jobId] = statusCode`
  - `receiptHash[jobId] = receiptHash`
  - `outputHash[jobId] = outputHash`
  - `metadata[jobId] = metadata`
  - `completedAt[jobId] = block.timestamp`
- Emit `JobCompleted`.

### 3.3. adminCancelJob

Signature (conceptual):

- `adminCancelJob(uint256 jobId)`

Rules:

- Require:
  - caller is `admin` (AdminGate / MasterKey controller).
  - `hasRecord[jobId] == true`.
- Effects:
  - `status[jobId] = 4` (Cancelled).
- Emit `JobCancelled`.

---

## 4. View functions

Read-only helpers:

- `getReceipt(jobId) -> (agentId, agentRuntime, status, receiptHash, outputHash, metadata, claimedAt, completedAt)`
- `getStatus(jobId) -> uint8`
- `hasReceipt(jobId) -> bool`

Typical observer flow:

1. Watch JobQueue events to see `jobId`.
2. Call `getReceipt(jobId)` on JobReceipts.
3. Verify:
   - Which agent handled it (`agentId`, `agentRuntime`).
   - Final status (`status`).
   - Off-chain receipt/output via hashes.

---

## 5. Access control & integration

### 5.1. Admin

- `admin` (or AdminGate) can:
  - Cancel receipts (set status to `Cancelled`).
  - In future versions, override/repair records in emergencies.

### 5.2. AgentRegistry

On `claimJob` and `completeJob`, JobReceipts should:

- Query `AgentRegistry`:
  - `isAgentActive(agentId) -> bool`
  - `getAgentRuntime(agentId) -> address`
- Enforce:
  - `isAgentActive == true`
  - `getAgentRuntime(agentId) == msg.sender`

This binds job handling to a registered, active agent.

### 5.3. JobQueue

JobReceipts treats JobQueue as canonical job store:

- At minimum, verify `jobId < JobQueue.nextJobId()`.
- Optionally read some job fields for sanity checks.

---

## 6. Events (suggested, conceptual)

- `JobClaimed(jobId, agentId, agentRuntime, claimedAt)`
- `JobCompleted(jobId, agentId, agentRuntime, status, receiptHash, outputHash, metadata, completedAt)`
- `JobCancelled(jobId, agentId, agentRuntime, oldStatus, newStatus)`

---

## 7. v2+ ideas

Future versions might add:

- Multiple receipts per job (competing agents).
- Links to ModelEvalRegistry for automatic evals on outputs.
- Stakes / slashing based on outcomes.
- Retry semantics and richer status codes.
- Aggregated per-agent stats on-chain.
