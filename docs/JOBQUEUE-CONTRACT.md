# VOID Network – JobQueue Contract Spec (v1, minimal)

JobQueue is the on-chain job registry for VOID (chainId 2050).

- Users and contracts can post jobs for AI agents and off-chain workers.
- Off-chain VOID agents read jobs, execute them, and write back receipts.
- The chain does not execute the AI – it only tracks what was requested and
  what was returned.

JobQueue cannot:
- Force agents to run off-chain work.
- Guarantee the quality of AI outputs.
- Directly control user balances or external chains.

It can:
- Store job metadata (who posted, what app, what payload hash).
- Track job lifecycle (posted -> claimed -> completed -> cancelled/expired).
- Emit events for off-chain agent infrastructure.
- Store minimal on-chain results (receipt hash, status metadata).

---

## 1. Job model

### 1.1 Types

- JobId – uint256 (monotonic counter)
- PayloadType – string (e.g. "json://void.ai/EmbeddingRequest/v1")
- PayloadHash – bytes32 (hash of off-chain payload)
- Poster – address (EOA or contract)
- AppTag – bytes32 (application tag, e.g. "NULLFEED", "VOID_OS")
- ModelId – string (optional hint to ModelRegistry)
- PolicyId – bytes32 (policy requirement tag)
- Budget – uint256 (optional budget / accounting)
- StepIndex – uint16 (for simple DAGs)
- JobStatus – enum:
  - Posted
  - Claimed
  - Completed
  - Cancelled
  - Expired (logical / optional explicit)

### 1.2 Stored job fields

For each jobId:

- poster: address
- appTag: bytes32
- payloadType: string
- payloadHash: bytes32
- modelHint: string (optional ModelRegistry modelId)
- policyTag: bytes32
- budget: uint256
- createdAt: uint64 (block timestamp)
- expiresAt: uint64 (0 if no expiry)
- status: JobStatus
- claimer: address (agent that claimed it)
- receiptHash: bytes32 (hash of off-chain result)
- receiptMeta: string (small JSON/meta)
- parentJobId: uint256 (0 if root)
- stepIndex: uint16

This is enough for Agent OS v1:
- Simple jobs
- Simple multi-step workflows via parentJobId + stepIndex
- Policy and model hints

---

## 2. Core flows

### 2.1 Post job

Function (conceptual):

- postJob(
    appTag,
    payloadType,
    payloadHash,
    modelHint,
    policyTag,
    budget,
    expiresAt,
    parentJobId,
    stepIndex
  ) -> jobId

Requirements:

- payloadHash != 0
- expiresAt == 0 or expiresAt > current time

Effects:

- nextJobId += 1
- Create Job struct with:
  - jobId = nextJobId
  - poster = msg.sender
  - createdAt = current time
  - status = Posted
- Emit JobPosted event.

Notes:

- Payment / escrow is out of scope for v1; budget is informational.
- Real payment logic can live in a separate rewards/escrow contract.

### 2.2 Claim job

Function:

- claimJob(jobId)

Requirements:

- status == Posted
- expiresAt == 0 or current time < expiresAt

Effects:

- status = Claimed
- claimer = msg.sender
- Emit JobClaimed event.

Integration:

- v1 keeps this open.
- Future versions can require claimer to be registered in AgentRegistry.

### 2.3 Complete job

Function:

- completeJob(jobId, receiptHash, receiptMeta)

Requirements:

- status == Claimed
- claimer == msg.sender (or admin override)

Effects:

- status = Completed
- receiptHash = receiptHash
- receiptMeta = receiptMeta
- Emit JobCompleted event.

Receipt metadata:

- Should be compact JSON:
  - outcome/status code
  - modelId / version used
  - error codes if any
  - optional policy verdict summary

### 2.4 Cancel job

Function:

- cancelJob(jobId)

Requirements:

- Caller is poster or admin.
- status in { Posted, Claimed }.

Effects:

- status = Cancelled
- Emit JobCancelled event.

### 2.5 Expiration (logical)

Base v1 keeps expiration mostly off-chain:

- A job with status == Posted and expiresAt < now is considered expired
  by agents, even if not explicitly marked.

Optionally, an admin helper:

- markExpired(jobId)

Requirements:

- status == Posted
- expiresAt > 0 and expiresAt < now

Effects:

- status = Expired
- Emit JobExpired event (optional).

---

## 3. View and query helpers

Read-only helpers:

- getJob(jobId) -> Job struct
- getStatus(jobId) -> JobStatus
- getPoster(jobId) -> address
- getClaimer(jobId) -> address
- getReceipt(jobId) -> (receiptHash, receiptMeta)

Real filtering/search is done off-chain by indexing JobPosted / JobClaimed /
JobCompleted events.

---

## 4. Events (conceptual)

Recommended events:

- JobPosted(
    uint256 jobId,
    address poster,
    bytes32 appTag,
    string payloadType,
    bytes32 payloadHash,
    string modelHint,
    bytes32 policyTag,
    uint256 budget,
    uint64 expiresAt,
    uint256 parentJobId,
    uint16 stepIndex
  )

- JobClaimed(
    uint256 jobId,
    address claimer
  )

- JobCompleted(
    uint256 jobId,
    address claimer,
    bytes32 receiptHash
  )

- JobCancelled(
    uint256 jobId,
    address caller
  )

Optional:

- JobExpired(
    uint256 jobId
  )

Indexers and agents will consume these events to build queues and dashboards.

---

## 5. Access control

Base assumptions for v1:

- Anyone can call postJob.
- Anyone can call claimJob (subject to off-chain policy).
- Only poster or admin can cancel jobs.
- Only claimer (or admin) can complete.

Admin (via AdminGate or simple admin address) can:

- Cancel or markExpired jobs in emergencies.
- Potentially override claimer in extreme cases.

Future extensions:

- Restrict claimJob to registered agents in AgentRegistry.
- App-specific ACLs or whitelists.

---

## 6. Integration points (Agent OS v1)

### 6.1 AgentRegistry

Registered agents will:

- Listen to JobPosted events.
- Filter by:
  - appTag
  - payloadType
  - modelHint
  - policyTag
- Decide whether to claim based on:
  - capabilities
  - policies
  - budgets or external incentives.

Future: JobQueue can optionally enforce that only registered agents claim.

### 6.2 ModelRegistry

Jobs may set modelHint to a ModelRegistry modelId:

- Agents resolve:
  - modelHint -> latest active version
  - model hash / uri / policyTag
- JobQueue itself treats modelHint as a hint; it does not verify model hashes.

### 6.3 PolicyGuard

policyTag in JobQueue jobs:

- Links jobs into wider policy framework.
- PolicyGuard and external agents decide:
  - Whether a given agent is allowed to process jobs with a given policyTag.
- JobQueue itself stores the tag but does not interpret it.

---

## 7. Minimal Solidity shape (sketch)

High-level structure:

- enum JobStatus { Posted, Claimed, Completed, Cancelled, Expired }

- struct Job {
    address poster;
    bytes32 appTag;
    string payloadType;
    bytes32 payloadHash;
    string modelHint;
    bytes32 policyTag;
    uint256 budget;
    uint64 createdAt;
    uint64 expiresAt;
    JobStatus status;
    address claimer;
    bytes32 receiptHash;
    string receiptMeta;
    uint256 parentJobId;
    uint16 stepIndex;
  }

- uint256 nextJobId;
- mapping(uint256 => Job) jobs;
- address admin; // or AdminGate

Core functions:

- postJob
- claimJob
- completeJob
- cancelJob
- optional markExpired
- view getters

Real implementation will add:

- Input validation and gas optimizations.
- Proper access control and admin plumbing.
- Optional tighter integration with AgentRegistry and PolicyGuard.
