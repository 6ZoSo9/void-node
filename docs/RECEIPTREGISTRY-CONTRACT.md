# VOID Network – ReceiptRegistry / PoPRegistry Spec (v1)

Chain: VOID devnet (chainId 2050)  
Role: On-chain Proof-of-Processing (PoP) registry for AI jobs.

JobQueue already tracks job lifecycle and `resultHash`. ReceiptRegistry
adds a separate, queryable ledger of which jobs were actually processed
by an off-chain agent.

It is intentionally small and conservative:

- It never executes AI.
- It never stores raw inputs/outputs.
- It only records that a particular (jobQueue, jobId) reached a final
  result consistent with on-chain JobQueue state.

This is v1 and assumes:

- A canonical JobQueue contract per network.
- A canonical ModelRegistry enforces model validity at postJob time
  (out of scope for this contract; we just mirror app/model IDs).

---

## 1. Responsibilities

ReceiptRegistry must:

- Accept receipt records keyed by (jobQueue, jobId).
- Verify each receipt against the JobQueue state:
  - Job exists and is Completed.
  - worker matches the job's recorded worker.
  - resultHash matches the job's recorded resultHash.
- Store a minimal record for each completed job:
  - jobQueue (address)
  - jobId (uint256)
  - poster (address)
  - worker (address)
  - payloadHash (bytes32)
  - resultHash (bytes32)
  - appKey (bytes32 = keccak256(bytes(appId)))
  - modelKey (bytes32 = keccak256(bytes(modelId)))
  - postedAt, completedAt, recordedAt (uint64)
- Emit events for off-chain analytics / monitoring.
- Optionally restrict which JobQueue contracts are allowed.

ReceiptRegistry cannot:

- Change JobQueue state.
- Fix or override a wrong resultHash.
- Enforce payments or slashing (later version).

---

## 2. External Assumptions (JobQueue)

We assume JobQueue exposes:

struct Job {
    address poster;
    address worker;
    string  appId;
    string  modelId;
    bytes32 payloadHash;
    bytes32 resultHash;
    uint8   status;     // 0=None,1=Posted,2=Claimed,3=Completed
    uint64  createdAt;  // seconds
    uint64  updatedAt;  // seconds
}

function jobs(uint256 id) external view returns (Job memory);

---

## 3. Internal Types & Storage

struct Receipt {
    address jobQueue;
    uint256 jobId;

    address poster;
    address worker;

    bytes32 payloadHash;
    bytes32 resultHash;

    // Derived tags for indexing
    bytes32 appKey;      // keccak256(bytes(appId))
    bytes32 modelKey;    // keccak256(bytes(modelId))

    uint64 postedAt;
    uint64 completedAt;
    uint64 recordedAt;   // block.timestamp when recorded
}

Primary key:

    bytes32 key = keccak256(abi.encodePacked(jobQueue, jobId));

Storage:

    mapping(bytes32 => Receipt) public receipts;
    mapping(bytes32 => bool)    public receiptExists;

Config:

    address public admin;                 // EOA or AdminGate/UpdateGate
    mapping(address => bool) public allowedJobQueues;
    address public modelRegistry;         // optional hint, unused in v1

---

## 4. Invariants

1. At most one receipt per (jobQueue, jobId):
   - receiptExists[key] is set on first record and never cleared.

2. Every stored receipt corresponds to a Completed job in JobQueue:
   - JobQueue(jobQueue).jobs(jobId).status == 3.

3. Receipt worker, payloadHash, resultHash match the JobQueue record
   at the time of recording.

4. recordedAt >= completedAt >= postedAt.

5. Admin cannot rewrite history:
   - No function to edit or delete existing receipts.

---

## 5. Events & Errors

Events:

    event ReceiptRecorded(
        address indexed jobQueue,
        uint256 indexed jobId,
        address indexed worker,
        bytes32 appKey,
        bytes32 modelKey,
        bytes32 payloadHash,
        bytes32 resultHash,
        uint64 postedAt,
        uint64 completedAt,
        uint64 recordedAt
    );

    event AllowedJobQueueUpdated(address jobQueue, bool allowed);
    event ModelRegistryUpdated(address modelRegistry);
    event AdminUpdated(address newAdmin);

Errors:

    error NotAdmin();
    error JobQueueNotAllowed(address jobQueue);
    error ReceiptAlreadyExists(address jobQueue, uint256 jobId);
    error JobNotCompleted(address jobQueue, uint256 jobId, uint8 status);
    error WorkerMismatch(address expected, address actual);
    error ResultHashMismatch(bytes32 expected, bytes32 actual);
    error PayloadHashMismatch(bytes32 expected, bytes32 actual);

---

## 6. Core API

recordReceipt:

    struct RecordArgs {
        address jobQueue;
        uint256 jobId;
        address worker;     // expected worker
        bytes32 resultHash; // expected resultHash
        // optional: bytes32 expectedPayloadHash;
    }

    function recordReceipt(RecordArgs calldata args) external;

Expected flow:

1) Check jobQueue allowlist (if used):

    if (!allowedJobQueues[args.jobQueue]) {
        revert JobQueueNotAllowed(args.jobQueue);
    }

2) Compute key and prevent duplicates:

    bytes32 key = keccak256(abi.encodePacked(args.jobQueue, args.jobId));
    if (receiptExists[key]) {
        revert ReceiptAlreadyExists(args.jobQueue, args.jobId);
    }

3) Load job from JobQueue:

    JobQueue jq = JobQueue(args.jobQueue);
    JobQueue.Job memory j = jq.jobs(args.jobId);

4) Validate job state:

    if (j.status != 3) {
        revert JobNotCompleted(args.jobQueue, args.jobId, j.status);
    }
    if (j.worker != args.worker) {
        revert WorkerMismatch(j.worker, args.worker);
    }
    if (j.resultHash != args.resultHash) {
        revert ResultHashMismatch(j.resultHash, args.resultHash);
    }

   (Optionally also check payloadHash if passed.)

5) Derive tags:

    bytes32 appKey   = keccak256(bytes(j.appId));
    bytes32 modelKey = keccak256(bytes(j.modelId));

6) Write receipt:

    Receipt storage r = receipts[key];
    r.jobQueue    = args.jobQueue;
    r.jobId       = args.jobId;
    r.poster      = j.poster;
    r.worker      = j.worker;
    r.payloadHash = j.payloadHash;
    r.resultHash  = j.resultHash;
    r.appKey      = appKey;
    r.modelKey    = modelKey;
    r.postedAt    = j.createdAt;
    r.completedAt = j.updatedAt;
    r.recordedAt  = uint64(block.timestamp);

    receiptExists[key] = true;

7) Emit event:

    emit ReceiptRecorded(
        args.jobQueue,
        args.jobId,
        j.worker,
        appKey,
        modelKey,
        j.payloadHash,
        j.resultHash,
        j.createdAt,
        j.updatedAt,
        uint64(block.timestamp)
    );

---

## 7. Admin / Config API

Admin controls which JobQueue addresses are trusted, not receipts.

    function setAdmin(address newAdmin) external;
    function setAllowedJobQueue(address jobQueue, bool allowed) external;
    function setModelRegistry(address _modelRegistry) external;

All three:

- Must be restricted to admin.
- Should be owned by AdminGate/UpdateGate in production, but can be an
  EOA in devnet.

No function exists to modify or delete stored receipts.

---

## 8. Read API

    function hasReceipt(address jobQueue, uint256 jobId)
        external
        view
        returns (bool);

    function getReceipt(address jobQueue, uint256 jobId)
        external
        view
        returns (Receipt memory);

    function getReceiptKey(address jobQueue, uint256 jobId)
        external
        pure
        returns (bytes32);

Indexing is expected off-chain (custom VOID indexers, TheGraph-style)
using ReceiptRecorded events.

---

## 9. Devnet Usage (current flow)

1) User posts jobs to JobQueue via ops/void-devnet-* scripts.
2) Off-chain VOID Agent claims and completes jobs, writing:
   - On-chain: resultHash + status=Completed.
   - Off-chain: JSONL receipts under ops/devnet-job-receipts.jsonl.
3) Coverage script void-devnet-jobs-coverage.sh checks completion and
   emits a Prom gauge.
4) Next step: a PoP bridge script that:
   - Reads ops/devnet-job-receipts.jsonl.
   - For each line, calls recordReceipt on ReceiptRegistry.
   - Fails fast if any invariant fails.

Once deployed and wired, ReceiptRegistry becomes the canonical
on-chain PoP ledger for AI jobs on VOID.
