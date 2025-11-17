# VOID Network – JobQueue Contract Spec (v1, chainId 2050)

JobQueue is the on-chain job registry for VOID.

- It does NOT run AI models or verify outputs.
- It only tracks jobs, their poster, payload hash, status, and a minimal result hash.
- Off-chain VOID agents watch events, pull jobs, execute them, and write back results.

---

## 1. Responsibilities & non-responsibilities

JobQueue MUST:
- Accept new jobs from users/contracts.
- Emit events when jobs are posted, claimed, completed, or cancelled.
- Track a full Job struct for each jobId.
- Allow off-chain workers to claim and complete jobs.
- Allow poster/admin to cancel jobs with an error code.
- Be governed by an admin address (AdminGate on VOID).

JobQueue CANNOT:
- Force off-chain work to be executed.
- Guarantee quality, safety, or timeliness of AI outputs.
- Enforce payment terms by itself (payments belong in other contracts).

---

## 2. Data model

### 2.1 Job struct

From the deployed devnet contract (simplified):

- jobId: bytes32
- chainId: uint256       (2050 for VOID)
- modelId: string        (e.g. "void/devnet/model:test-v1")
- poster: address        (who posted the job)
- appTag: string         (e.g. "nullfeed-devnet")
- payloadHash: bytes32   (hash of request payload stored off-chain)
- postedAt: uint64       (unix seconds)
- status: uint8          (enum-like, see below)
- worker: address        (who claimed/completed the job)
- resultHash: bytes32    (hash of result payload stored off-chain)
- completedAt: uint64    (unix seconds; completion or cancel time)
- errorCode: uint32      (0 = OK, non-zero = app-defined error)

### 2.2 Storage

Conceptually:

- jobs[jobId] -> Job
- totalJobs: uint256
- admin: address (should equal AdminGate on devnet/mainnet)

Agents should treat jobId as the canonical key. Do NOT rely on array indices.

---

## 3. Status lifecycle

### 3.1 Status values (uint8)

Observed via getJobStatus(jobId):

- 0 = NONE (no job present)
- 1 = POSTED
- 2 = CLAIMED
- 3 = COMPLETED
- 4 = CANCELLED (inferred from cancel flow)

### 3.2 Allowed transitions

- NONE -> POSTED  
  - via postJob

- POSTED -> CLAIMED  
  - via claimJob(jobId) by a worker

- CLAIMED -> COMPLETED  
  - via completeJob(jobId, resultHash) by that same worker

- POSTED or CLAIMED -> CANCELLED  
  - via cancelJob(jobId, errorCode) by poster or admin

Any other transition SHOULD revert:
- Claim non-existent or non-POSTED job.
- Complete when status != CLAIMED or worker != msg.sender.
- Cancel if caller is not poster and not admin.

---

## 4. External interface (functions)

### 4.1 View functions

- admin() -> address
- totalJobs() -> uint256
- getJob(jobId: bytes32) -> Job
- getJobStatus(jobId: bytes32) -> uint8
- hasResult(jobId: bytes32) -> bool

### 4.2 Posting a job

postJob(modelId, payloadHash, appTag)

Inputs:
- modelId: string (human-friendly model identifier)
- payloadHash: bytes32 (hash of request payload)
- appTag: string (which app / pipeline created the job)

Effects:
- Derives a unique jobId.
- Fills Job struct with chainId=2050, poster=msg.sender, postedAt=block.timestamp.
- status = POSTED (1).
- totalJobs++.
- Emits JobPosted.

msg.value MAY be used as stake/payment in higher-level designs, but JobQueue itself only records the job.

### 4.3 Claiming a job

claimJob(jobId)

- Callable by any address.
- Requires status == POSTED.
- Sets status = CLAIMED, worker = msg.sender.
- Emits JobClaimed.

### 4.4 Completing a job

completeJob(jobId, resultHash)

- Callable only by the current worker for that job.
- Requires status == CLAIMED.
- Sets:
  - status = COMPLETED
  - resultHash = resultHash
  - completedAt = block.timestamp
  - errorCode = 0
- Emits JobCompleted.

### 4.5 Cancelling a job

cancelJob(jobId, errorCode)

- Allowed if caller is job.poster or admin.
- Sets:
  - status = CANCELLED
  - errorCode = errorCode
  - completedAt = block.timestamp
- Emits JobCancelled.

---

## 5. Events (logical shape)

Event topics observed on devnet:

- JobPosted:    topic0 = 0x9cc10673...
- JobClaimed:   topic0 = 0x02a47c15...
- JobCompleted: topic0 = 0x3460f941...
- AdminChanged: topic0 = 0x7e644d79...

Logical event forms (approximate):

- JobPosted(jobId, modelIdHash, poster, chainId, postedAt, modelId, appTag, payloadHash)
- JobClaimed(jobId, worker, claimedAt)
- JobCompleted(jobId, worker, resultHash, completedAt)
- JobCancelled(jobId, actor, errorCode, cancelledAt)
- AdminChanged(oldAdmin, newAdmin)

Agents MUST:
- Watch JobPosted to discover new jobs.
- Watch JobClaimed/JobCompleted/JobCancelled to track lifecycle.
- Watch AdminChanged to keep track of governance.

---

## 6. Admin & governance

- admin() is set to AdminGate (master-key governed).
- Posting/claiming/completing jobs is permissionless.
- Admin powers:
  - Rotate admin (via AdminGate).
  - Cancel abusive or stuck jobs.
- Nodes and agents MAY enforce policies that require admin to be a known AdminGate instance.

---

## 7. Devnet monitoring (current)

The textfile exporter void_jobqueue_devnet.prom exposes:

- void_jobqueue_devnet_health{chain="devnet"}
  - 1 if contract exists, totalJobs() OK, and admin == AdminGate.
  - 0 on any hard failure.

- void_jobqueue_devnet_total_jobs{chain="devnet"}
  - Mirrors totalJobs() from the contract.

- void_jobqueue_admin_mismatch{chain="devnet"}
  - 1 if admin() != AdminGate.
  - 0 if admin() matches AdminGate.

Prometheus aggregates:

- void:jobqueue:devnet:health
- void:jobqueue:devnet:total_jobs
- void:jobqueue:devnet:admin_mismatch

These form the base SLOs for JobQueue on VOID devnet.
