# VOID Chain – JobQueue Contract Spec (v1, mainnet-oriented)

JobQueue is the **on-chain job ledger** for VOID (chainId 2050).

- Users / dApps / agents post **jobs** that describe work to be done (usually AI tasks).
- Off-chain VOID agents read jobs, do the work, and write back **receipts** via `ReceiptRegistry`.
- VOID nodes never run the AI; they only enforce the **job lifecycle** and a minimal set of invariants.

This spec is the **mainnet-facing behavior**. Devnet scripts must conform to this over time.

---

## 1. Responsibilities

JobQueue must:

- Accept new jobs from EOAs and contracts.
- Track **job lifecycle** based on a small state machine:
  - `0 = NONE` (unset / invalid)
  - `1 = POSTED`
  - `2 = CLAIMED`
  - `3 = COMPLETED`
  - `4 = CANCELLED`
  - `5 = EXPIRED`
- Store minimal metadata so off-chain infra can reconstruct:
  - who posted the job
  - which app / model it targets
  - what payload hash was committed
- Emit events for **every state transition** agents care about.
- Expose view functions so:
  - wallets can show job history
  - agents can find work and prove what they did.

JobQueue cannot:

- Force any off-chain agent to actually do the job.
- Guarantee the quality of outputs.
- Guarantee “best agent” selection — that is an off-chain concern.
- Directly move user balances / tokens (beyond optional future fee hooks).

---

## 2. Core Data Model

### 2.1 JobId

- `jobId` is a `bytes32` identifier.
- v1 recommended definition:

`jobId = keccak256(abi.encodePacked(
    chainId,          // uint256
    appId,            // bytes32
    modelId,          // bytes32
    payloadHash,      // bytes32
    postedBy,         // address
    nonce             // uint256 per poster
));`

Implementation detail:

- Use a per-poster nonce: `mapping(address => uint256) nonces;`
- This makes `jobId` derivable off-chain and avoids collisions.

### 2.2 Job Struct (conceptual)

    struct Job {
        address postedBy;      // who posted
        bytes32 appId;         // application namespace (e.g. "void-demo-app-1")
        bytes32 modelId;       // model namespace (e.g. "void-demo-llm-1")
        bytes32 payloadHash;   // hash of manifest / input blob
        uint64  postedAt;      // block timestamp at POSTED
        uint64  claimedAt;     // block timestamp at CLAIMED (0 if never)
        uint64  completedAt;   // block timestamp at COMPLETED (0 if never)
        uint8   status;        // 0 NONE, 1 POSTED, 2 CLAIMED, 3 COMPLETED, 4 CANCELLED, 5 EXPIRED
    }

Notes:

- Result hashes **do not** live here. They live in `ReceiptRegistry`, which may have multiple receipts per job.

### 2.3 Global Counters

JobQueue should track:

- `uint256 public totalJobs;` – count of jobs ever posted (including cancelled/expired).
- `mapping(bytes32 => Job) public jobs;` – main storage.

Optional but useful:

- `mapping(address => uint256) public jobsPostedBy;`
- `mapping(bytes32 => uint256) public jobsByApp;`

Only `totalJobs` is strictly required for correctness.

---

## 3. Lifecycle & State Machine

### 3.1 States

- `0 = NONE`       – no job stored at this id.
- `1 = POSTED`     – job exists, not yet claimed.
- `2 = CLAIMED`    – some agent has claimed responsibility.
- `3 = COMPLETED`  – job completed and at least one receipt exists in ReceiptRegistry.
- `4 = CANCELLED`  – job cancelled by poster or admin before completion.
- `5 = EXPIRED`    – job auto-expired by time rules.

### 3.2 Allowed Transitions

Valid transitions:

- `NONE -> POSTED`
- `POSTED -> CLAIMED`
- `POSTED -> CANCELLED`
- `POSTED -> EXPIRED`
- `CLAIMED -> COMPLETED`
- `CLAIMED -> CANCELLED` (optional, via admin or poster with rules)
- `CLAIMED -> EXPIRED` (if agents stall too long)

Invalid transitions MUST revert:

- `COMPLETED -> anything`
- `CANCELLED -> anything`
- `EXPIRED -> anything`
- `NONE -> CLAIMED`, `NONE -> COMPLETED`, etc.

### 3.3 Roles

v1 keeps roles simple:

- **Poster**: `msg.sender` on `postJob`.
- **Agent**: off-chain agent address that claims and completes jobs.
- **Admin**: admin (AdminGate / master-key governed) allowed to:
  - cancel misbehaving jobs
  - mark jobs expired in bulk (future version).

Most operations are permissionless:

- Any address can post jobs.
- Any agent can claim eligible jobs.

---

## 4. External Interfaces (v1 – conceptual)

### 4.1 Post Job

    function postJob(
        bytes32 appId,
        bytes32 modelId,
        bytes32 payloadHash
    ) external returns (bytes32 jobId);

Semantics:

- Derive `jobId` as above.
- Require `jobs[jobId].status == 0` to avoid collisions.
- Store:
  - `postedBy = msg.sender`
  - `postedAt = uint64(block.timestamp)`
  - `status = 1` (POSTED)
- Increment `totalJobs`.
- Emit `JobPosted`.

### 4.2 Claim Job

    function claimJob(bytes32 jobId) external;

Semantics:

- Fetch `Job storage j = jobs[jobId];`
- Require `j.status == 1` (POSTED).
- Set `claimedAt = uint64(block.timestamp)` (optional but recommended).
- Set `status = 2` (CLAIMED).
- Emit `JobClaimed(jobId, msg.sender)`.

### 4.3 Mark Completed (ReceiptRegistry hook)

    function markCompleted(bytes32 jobId) external;

Semantics:

- Only callable by `ReceiptRegistry` (and optionally admin).
- Require at least one valid receipt exists for `jobId`.
- Set `status = 3` (COMPLETED) and `completedAt = block.timestamp`.
- Emit `JobCompleted(jobId)`.

### 4.4 Cancel / Expire

    function cancelJob(bytes32 jobId) external;
    function expireJob(bytes32 jobId) external;

Suggested semantics:

- `cancelJob`:
  - If `msg.sender == jobs[jobId].postedBy` and `status` in `{1,2}`, allow.
  - Or if `msg.sender` is admin, allow forced cancellation.
  - Set `status = 4` (CANCELLED).
  - Emit `JobCancelled(jobId, msg.sender, reasonCode)`.

- `expireJob`:
  - Callable by anyone or by a designated sweeper.
  - Apply time rules, e.g.:
    - `status == 1` and `now > postedAt + POST_EXPIRY_SECS`
    - `status == 2` and `now > claimedAt + CLAIM_EXPIRY_SECS`
  - Set `status = 5` (EXPIRED).
  - Emit `JobExpired(jobId, reasonCode)`.

### 4.5 Views

At minimum:

- `function getJob(bytes32 jobId) external view returns (Job memory);`
- `function getJobStatus(bytes32 jobId) external view returns (uint8 status);`
- `function totalJobs() external view returns (uint256);`

---

## 5. Events

    event JobPosted(
        bytes32 indexed jobId,
        address indexed postedBy,
        bytes32 indexed appId,
        bytes32 modelId,
        bytes32 payloadHash
    );

    event JobClaimed(
        bytes32 indexed jobId,
        address indexed agent
    );

    event JobCompleted(
        bytes32 indexed jobId
    );

    event JobCancelled(
        bytes32 indexed jobId,
        address indexed caller,
        uint8   reasonCode
    );

    event JobExpired(
        bytes32 indexed jobId,
        uint8   reasonCode
    );

Reason codes are left as an enum in doc form; v1 can start with:

- `0 = UNSPECIFIED`
- `1 = POSTER_REQUEST`
- `2 = ADMIN_FORCE`
- `3 = TIMEOUT_POSTED`
- `4 = TIMEOUT_CLAIMED`

---

## 6. Admin & Gate Wiring (VOID-specific)

On VOID mainnet:

- `JobQueue` is **owned by AdminGate**, which itself is governed by the master key.
- Admin-level actions (`forceCancel`, `forceExpireBatch`, future fee toggles) must be restricted to AdminGate.
- Normal posting/claiming/completion paths are **permissionless** and do not require the master key.

This preserves:

- Open job posting and agent participation.
- A narrow, auditable control surface for protocol-level interventions.

---

## 7. Compatibility Notes (Devnet → Mainnet)

- Devnet scripts (`void-devnet-post-job.sh`, agent sweepers, coverage exporters) should treat this spec as canonical.
- Any deviation (extra fields, different status codes) must be documented with:
  - a migration plan
  - a concrete mapping back to this v1 state machine.
- For mainnet, JobQueue MUST be simple enough that:
  - light clients and off-chain agents can reconstruct job state cheaply
  - VOID Node can expose JobQueue-derived metrics without heavy queries.

End of v1 spec.
