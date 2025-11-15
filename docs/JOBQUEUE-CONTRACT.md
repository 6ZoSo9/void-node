# VOID Network - JobQueue Contract Spec (v1)

JobQueue is the on-chain job registry for VOID (chainId 2050).

- Off-chain agents (wallet agents, relayers, AI workers) read jobs from JobQueue.
- They execute work off-chain (AI inference, indexing, analysis, etc.).
- They write back receipts so the chain can track what was done.

The chain does NOT run the AI itself. It only tracks:
- What was requested.
- Who requested it.
- Which agent claimed it.
- What result/receipt was reported.

---

## 1. Responsibilities

JobQueue MUST:

- Accept new jobs from users and contracts.
- Track job lifecycle:
  - Posted -> Claimed -> Completed
  - Optional: Cancelled / Expired
- Store enough metadata for off-chain workers to:
  - Find relevant jobs.
  - Verify payload hashes / manifests.
  - Prove which job they are answering.
- Emit events for off-chain infra (indexers, agent runners).
- Store minimal on-chain results (receipt hash + status + small metadata).

JobQueue MUST NOT:

- Enforce off-chain execution or result quality.
- Store large blobs of data (only hashes / small fields).
- Depend on a specific agent implementation.

---

## 2. Data Model

### 2.1 JobId

- Type: uint256
- Global monotonic counter: jobId = ++lastJobId
- Never reused, even after cancellation or expiry.

### 2.2 Job struct

Each job stores (v1):

- uint256 id          - unique job id
- address poster      - job creator (EOA or contract)
- bytes32 payloadHash - hash of the job payload (e.g. JSON/CBOR manifest)
- bytes32 appTag      - app/tenant tag (e.g. keccak256("nullfeed"))
- uint64  postedAt    - block timestamp when posted
- uint64  notBefore   - earliest timestamp an agent should start work (0 = none)
- uint64  expiresAt   - soft expiry timestamp (0 = none)
- address claimedBy   - agent that claimed the job (0 until claim)
- JobStatus status    - enum: Posted, Claimed, Completed, Cancelled, Expired
- bytes32 receiptHash - hash of off-chain result / receipt payload
- uint256 reward      - reserved for future incentive model (0 in v1)

### 2.3 Status enum

enum JobStatus {
    Posted,
    Claimed,
    Completed,
    Cancelled,
    Expired
}

Invariants:

- Posted    - initial state after postJob
- Claimed   - someone claimed the job
- Completed - claimed agent submitted a receipt
- Cancelled - poster cancelled before completion
- Expired   - marked expired after expiresAt

---

## 3. Events

JobQueue is event-driven. Minimum events:

event JobPosted(
    uint256 indexed jobId,
    address indexed poster,
    bytes32 indexed appTag,
    bytes32 payloadHash,
    uint64 notBefore,
    uint64 expiresAt
);

event JobClaimed(
    uint256 indexed jobId,
    address indexed agent
);

event JobCompleted(
    uint256 indexed jobId,
    address indexed agent,
    bytes32 receiptHash
);

event JobCancelled(
    uint256 indexed jobId,
    address indexed poster
);

event JobExpired(
    uint256 indexed jobId
);

---

## 4. Core Functions (v1)

### 4.1 postJob

function postJob(
    bytes32 payloadHash,
    bytes32 appTag,
    uint64  notBefore,
    uint64  expiresAt
) external returns (uint256 jobId);

Rules:

- msg.sender becomes poster.
- Requirements:
  - payloadHash != 0x0
  - if expiresAt != 0 then expiresAt > block.timestamp
  - if notBefore != 0 and expiresAt != 0 then notBefore <= expiresAt
- Effects:
  - lastJobId++
  - create Job with:
    - id = lastJobId
    - poster = msg.sender
    - status = Posted
    - claimedBy = address(0)
  - emit JobPosted

### 4.2 getJob

function getJob(uint256 jobId) external view returns (Job memory);

- Returns the full Job struct.
- Reverts if jobId == 0 or jobId > lastJobId.

### 4.3 claimJob

function claimJob(uint256 jobId) external;

Rules:

- Called by an agent that wants to own the job.
- Requirements:
  - job exists
  - status == Posted
  - claimedBy == address(0)
  - if notBefore != 0 then block.timestamp >= notBefore
  - if expiresAt != 0 then block.timestamp <= expiresAt
- Effects:
  - claimedBy = msg.sender
  - status = Claimed
  - emit JobClaimed(jobId, msg.sender)

### 4.4 completeJob

function completeJob(uint256 jobId, bytes32 receiptHash) external;

Rules:

- Called by the claiming agent after work is done.
- Requirements:
  - job exists
  - status == Claimed
  - claimedBy == msg.sender
  - receiptHash != 0x0
- Effects:
  - status = Completed
  - receiptHash = receiptHash
  - emit JobCompleted(jobId, msg.sender, receiptHash)

### 4.5 cancelJob

function cancelJob(uint256 jobId) external;

Rules:

- Called by the poster to cancel a job.
- Requirements:
  - job exists
  - status is Posted or Claimed
  - poster == msg.sender
- Effects:
  - status = Cancelled
  - emit JobCancelled(jobId, msg.sender)

### 4.6 markExpired

function markExpired(uint256 jobId) external;

Rules:

- Public maintenance helper; anyone can call.
- Requirements:
  - job exists
  - status is Posted or Claimed
  - expiresAt != 0
  - block.timestamp > expiresAt
- Effects:
  - status = Expired
  - emit JobExpired(jobId)

---

## 5. Access Control and Governance

For v1:

- JobQueue can be Ownable (or similar):
  - owner may be allowed to pause/unpause in future versions.
  - owner may be allowed to update config fields later.
- No masterKey logic lives directly in JobQueue.
- AdminGate / ConfigGate are responsible for:
  - tracking JobQueue as a system contract
  - exposing its address to nodes, wallets, and agents
  - handling upgrades (new JobQueue address) if we deploy v2+

On devnet:

- owner = deployer (Anvil dev key).

On mainnet:

- owner will be tied to the governance / key model we defined in VOID-KEY-MODEL-V1.

---

## 6. Integration Points

JobQueue integrates with:

- AgentRegistry:
  - off-chain schedulers filter jobs by appTag, poster, etc.
  - match jobs to registered / trusted agents.
- ModelRegistry and DatasetRegistry:
  - payloadHash can reference manifests that specify model/dataset ids.
- Wallet / Obelisk Agent:
  - can post jobs on behalf of users (with on-chain payment logic handled elsewhere).

Future (not required for v1):

- On-chain budgeting / rewards per job.
- Reputation / slashing hooks per agent.
- Richer receipt types (ZK proofs, TEE quotes, PoP receipts).

---

## 7. Testing Requirements

The v1 tests MUST cover:

- postJob:
  - creates a job with correct fields.
  - reverts on bad payloadHash or invalid timestamps.
- claimJob:
  - only works from Posted state.
  - respects notBefore and expiresAt.
  - cannot be called twice.
- completeJob:
  - only the claiming agent can complete.
  - sets status and receiptHash correctly.
- cancelJob:
  - only poster can cancel.
  - cannot cancel after Completed / Cancelled / Expired.
- markExpired:
  - only works after expiresAt (when set).
  - moves status to Expired from Posted or Claimed.

This file is the authoritative JobQueue contract spec for v1. Any breaking changes should go into a new document (e.g. JOBQUEUE-CONTRACT-v2.md).
