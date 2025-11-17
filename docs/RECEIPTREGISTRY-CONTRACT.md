# VOID Network – ReceiptRegistry Contract Spec (v1, minimal)

ReceiptRegistry is the on-chain registry of AI job receipts for VOID (chainId 2050+).

- JobQueue tracks requested work (jobs).
- ReceiptRegistry tracks completed work (receipts for those jobs).

It is the canonical place to:
- Prove that some agent claims to have completed a job.
- Anchor hashes for inputs, outputs, and results.
- Drive metrics, accountability, and potential slashing off-chain.

This spec matches the devnet behavior (jobs.jsonl + receipts.jsonl), but moves
the truth of receipts on-chain.

---

## 1. Responsibilities

ReceiptRegistry must:

- Accept new receipts that reference a job (by jobId from JobQueue).
- Store minimal but sufficient metadata to prove:
  - which job was completed
  - which model was used
  - which agent submitted the receipt
  - what hashes (input, output, model) were involved
  - when it completed
- Emit events when receipts are created or updated.
- Allow querying receipts by:
  - jobId
  - receiptId
  - agent
  - modelId (optional or indexable)
- Be controlled by an admin (AdminGate / master-key governed).

ReceiptRegistry must NOT:

- Execute AI models.
- Decide which model result is “correct”.
- Manage balances or payouts directly (that’s for other contracts).
- Override JobQueue’s meaning of job lifecycle.

It is a bookkeeping and evidence layer, not an oracle of truth about model quality.

---

## 2. Data model

Conceptual receipt struct (Solidity-style):

    struct Receipt {
        bytes32 jobId;        // JobQueue jobId (canonical)
        bytes32 receiptId;    // Unique id for this receipt
        address agent;        // Who submitted this receipt
        string  modelId;      // Human-readable model identifier (e.g. "gpt-4.1-mini")
        bytes32 inputHash;    // Hash of input payload (CBOR manifest, etc.)
        bytes32 outputHash;   // Hash of output payload (result manifest / transcript)
        bytes32 modelHash;    // Hash of model version / weights / manifest
        uint64  chainId;      // Chain this job/receipt belongs to (e.g. 2050)
        uint64  createdAt;    // Block timestamp when receipt was recorded
        uint8   status;       // 0=pending, 1=completed, 2=failed, etc.
    }

Storage:

- mapping(bytes32 => Receipt) by receiptId.
- mapping(bytes32 => bytes32[]) receipts by jobId (list of receiptIds).

Optional v2 indexes (not required for v1):

- receipts by agent
- receipts by modelId (hash key + smaller index)

For v1, minimal indexing is fine: per-job lists plus a direct receiptId mapping.

---

## 3. Core functions (v1)

### 3.1 submitReceipt

    function submitReceipt(ReceiptInput calldata r) external returns (bytes32 receiptId);

ReceiptInput contains:

- jobId
- modelId
- inputHash
- outputHash
- modelHash
- status

Behavior:

- Compute receiptId, for example:

      receiptId = keccak256(abi.encode(
          r.jobId,
          msg.sender,
          r.inputHash,
          r.outputHash,
          block.timestamp
      ));

- Require JobQueue.jobExists(jobId) is true.
- Optionally require AgentRegistry.isAuthorized(msg.sender, modelId) is true.
- Store the full Receipt struct.
- Append receiptId to the per-job list.
- Emit ReceiptSubmitted(jobId, receiptId, msg.sender, modelId, status).

Access control (v1):

- Default: any address can submit receipts.
- Optional admin policy: only known agents (in AgentRegistry) can submit for certain models.

### 3.2 getReceipt

    function getReceipt(bytes32 receiptId) external view returns (Receipt memory);

Simple getter.

### 3.3 getReceiptsForJob

    function getReceiptsForJob(bytes32 jobId) external view returns (bytes32[] memory);

Returns the list of receiptIds; callers can fetch each Receipt.

### 3.4 markReceiptStatus (optional)

    function markReceiptStatus(bytes32 receiptId, uint8 status) external;

- Only callable by admin (AdminGate) or a policy contract.
- Used to mark receipts as disputed, invalid, etc.

---

## 4. Events

    event ReceiptSubmitted(
        bytes32 indexed jobId,
        bytes32 indexed receiptId,
        address indexed agent,
        string  modelId,
        uint8   status
    );

    event ReceiptStatusUpdated(
        bytes32 indexed receiptId,
        uint8   oldStatus,
        uint8   newStatus
    );

Events let indexers and Prometheus bridges:

- Count receipts per job, model, agent.
- Detect jobs without receipts or low coverage.
- Track disputed receipts.

---

## 5. Admin / control

ReceiptRegistry has a single admin address, set at construction:

- For VOID, admin should be an AdminGate contract governed by the master key.

Admin can:

- Update policy hooks (AgentRegistry address, JobQueue address, etc.).
- Pause or unpause receipt submission (emergency).
- Configure allowed status transitions.

Admin cannot in v1:

- Rewrite existing receipt hashes.
- Arbitrarily delete receipts.

---

## 6. Integration with JobQueue

ReceiptRegistry should:

- Know the JobQueue contract address.
- Call JobQueue.jobExists(jobId) (or equivalent) to ensure the job is valid.
- Trust JobQueue for basic job lifecycle tracking (posted, cancelled, etc.).

JobQueue does not need to call ReceiptRegistry in v1; this avoids tight coupling.

Off-chain:

- Indexers combine JobQueue and ReceiptRegistry events to compute:
  - jobs_without_receipts
  - jobs_receipt_coverage
  - per-agent and per-model performance.

This maps directly to existing devnet Prometheus metrics:

- void:devnet:jobs_total
- void:devnet:receipts_total
- void:devnet:jobs_without_receipts
- void:devnet:jobs_receipt_coverage
- and the per-model variants.

---

## 7. Security and abuse considerations

ReceiptRegistry must be hardened against:

- Spam: unlimited receipts for fake jobs.
  - Mitigation: JobQueue.jobExists(jobId) must be true.
  - Future: require stake or bond for agents.

- Replay: same receipt submitted multiple times.
  - Enforce unique receiptId.
  - Optional guard: reject identical jobId + agent + inputHash + outputHash combos.

- Admin abuse:
  - Admin can only mark status, not change hashes.
  - All admin actions should emit events and can be further gated by UpdateGate.

---

## 8. Mapping devnet JSONL to ReceiptRegistry

Current devnet receipts in ops/devnet/receipts.jsonl conceptually become:

- jobId → bytes32
- receiptId → derived from (jobId, agent, receiptTs) or explicitly stored
- status → enum value
- modelId → same as JSONL field
- agent → from JSONL
- receiptTs → createdAt in the on-chain struct
- inputHash, outputHash, modelHash → additional fields (we already have hashes in the agent pipeline)

Once ReceiptRegistry is live, JSONL becomes a client of the contract, not the source of truth.
