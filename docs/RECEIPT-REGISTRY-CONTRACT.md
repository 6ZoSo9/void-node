# VOID Network – ReceiptRegistry Contract Spec (v1, minimal)

ReceiptRegistry is the **on-chain index of job receipts** for VOID (chainId 2050).

It does NOT:
- Execute AI models.
- Verify that off-chain outputs are “correct”.
- Replace the JobQueue or JobReceipts contracts.

It **links jobs to receipts** so that:
- Nodes, agents, and explorers can see which jobs have receipts.
- Off-chain infra (like your devnet JSONL + Prometheus) can cross-check on-chain state.
- Policy and accounting layers (later) can reason about coverage, latency, and quality.

---

## 1. Responsibilities

ReceiptRegistry must:

- Store receipts keyed by a **jobId** and **receiptId**.
- Allow the admin (AdminGate-controlled) to **attach** and optionally **update** receipts.
- Track minimal metadata needed for AI/ops:
  - `jobId` (bytes32 or string hash)
  - `receiptId` (bytes32 or string hash)
  - `jobQueue` (address of JobQueue)
  - `modelId` (string, matching ModelRegistry)
  - `agent` (address of the agent that claims to have run the job)
  - `status` (enum or small uint; e.g. `None/Pending/Completed/Failed`)
  - `postedAt` / `completedAt` timestamps (block timestamps)
  - Optional `offchainRef` (hash/URI pointing to off-chain receipt payload)
- Emit events whenever a receipt is created or updated.
- Allow **read-only inspection** of receipts by job, by receipt, and by agent.

ReceiptRegistry must not:

- Allow arbitrary accounts to forge receipts (only admin / trusted writer).
- Bypass AdminGate or UpdateGate governance.
- Hold user funds or control balances.

---

## 2. Roles & Access Control

Core roles:

- **Admin** (`admin` address)
  - Set once at construction time.
  - Expected to be the **AdminGate** contract on chainId 2050.
- **Writer(s)**
  - Simplest v1: only `admin` can write.
  - Future versions may allow AdminGate to delegate write rights to specific agent operators.
- **Readers**
  - Anyone can read receipts and introspect job coverage.

Access rules (v1):

- `onlyAdmin` modifier:
  - `msg.sender` must equal `admin`.
  - Used on all write operations: register/update receipts, change config, set admin.

Admin responsibilities:

- Configure the initial `jobQueue` reference (optional but recommended).
- Attach receipts after verifying off-chain evidence (or delegating to trusted infra).
- Optionally deactivate bad receipts or mark them as failed.

---

## 3. Data Model

Suggested minimal struct:

- `struct ReceiptInfo {`
  - `bytes32 jobId;`              // JobQueue job identifier (or hash of external jobId)
  - `bytes32 receiptId;`          // Unique per job, or globally unique
  - `address jobQueue;`           // JobQueue that owns the job
  - `string modelId;`             // Matches ModelRegistry modelId
  - `address agent;`              // Off-chain agent / signer
  - `uint8 status;`               // 0=None, 1=Completed, 2=Failed, 3=Cancelled, etc.
  - `uint64 postedAt;`            // Timestamp when job was posted (or 0 if unknown)
  - `uint64 completedAt;`         // Timestamp when receipt was finalized
  - `bytes32 offchainRef;`        // Hash / CID / short reference for off-chain payload
`}`

Mappings / indexes:

- `mapping(bytes32 => ReceiptInfo) public receiptsById;`
  - Keyed by `receiptKey = keccak256(jobId, receiptId)` or similar.
- Optional helper indexes for query:
  - `mapping(bytes32 => bytes32[]) receiptsForJob;`         // jobId -> list of receiptKeys
  - `mapping(address => bytes32[]) receiptsByAgent;`        // agent -> list of receiptKeys

Design goals:

- **Compact**: do not store full receipt payloads on-chain; keep them off-chain with a hash.
- **Stable keys**: use deterministic derived keys so off-chain infra can recompute them.
- **Cross-chain ready**: jobId/modelId can be opaque hashes; we only care they are consistent.

---

## 4. Core Functions (v1)

Public/external functions:

1. **Attach a receipt**
   - `function attachReceipt(ReceiptInput calldata in) external onlyAdmin`
   - Where `ReceiptInput` includes:
     - `bytes32 jobId`
     - `bytes32 receiptId`
     - `address jobQueue`
     - `string modelId`
     - `address agent`
     - `uint8 status`
     - `uint64 postedAt`
     - `uint64 completedAt`
     - `bytes32 offchainRef`

   Behavior:
   - Compute `key = keccak256(abi.encode(jobId, receiptId))`.
   - Require `status != 0` (no `None` receipts).
   - If new key:
     - Create a new `ReceiptInfo`.
     - Push `key` into `receiptsForJob[jobId]` and `receiptsByAgent[agent]`.
   - If existing key:
     - Update fields that are allowed to change (e.g. status, completedAt, offchainRef).
   - Emit `ReceiptAttached(jobId, receiptId, jobQueue, modelId, agent, status, offchainRef)`.

2. **Get receipt by job + receiptId**
   - `function getReceipt(bytes32 jobId, bytes32 receiptId) external view returns (ReceiptInfo memory)`
   - Uses the same `key = keccak256(abi.encode(jobId, receiptId))`.

3. **List receipts for a job**
   - `function getReceiptsForJob(bytes32 jobId) external view returns (ReceiptInfo[] memory)`
   - Returns a packed list via `receiptsForJob[jobId]`.

4. **List receipts for an agent**
   - `function getReceiptsForAgent(address agent) external view returns (ReceiptInfo[] memory)`
   - Useful for agent coverage / accounting.

5. **Admin config**
   - `function setAdmin(address newAdmin) external onlyAdmin`
   - `function setDefaultJobQueue(address jobQueue) external onlyAdmin` (optional)

---

## 5. Events

At minimum:

- `event ReceiptAttached(`
  - `bytes32 indexed jobId,`
  - `bytes32 indexed receiptId,`
  - `address indexed agent,`
  - `address jobQueue,`
  - `string modelId,`
  - `uint8 status,`
  - `bytes32 offchainRef`
  - `);`

Optional:

- `event AdminChanged(address indexed oldAdmin, address indexed newAdmin);`
- `event DefaultJobQueueChanged(address indexed oldQueue, address indexed newQueue);`

These events are the bridge for:

- Off-chain log scrapers,
- Prometheus exporters,
- Coverage dashboards (jobs vs receipts),
- Forensic tools / accounting.

---

## 6. Integration with JobQueue & JobReceipts

Expected flow in VOID devnet / mainnet:

1. Job is posted to **JobQueue** (`jobId` assigned).
2. Off-chain agent picks the job, runs the model, and writes a **JobReceipt** record off-chain.
3. Infra verifies the result / policies.
4. Admin (or trusted writer under AdminGate) calls `ReceiptRegistry.attachReceipt`:
   - Links `jobId` → `receiptId` + `modelId` + `agent` + `offchainRef`.
5. Off-chain exporters:
   - Scan ReceiptRegistry events and on-chain storage.
   - Compare with JobQueue state and their own JSONL receipts.
   - Emit coverage metrics like:
     - `jobs_total`, `receipts_total`, `jobs_without_receipts`,
       and per-model versions of the same.

Key invariants:

- `jobId` in ReceiptRegistry must correspond to a real job in JobQueue (enforced off-chain in v1).
- `receiptId` should be unique per job.
- Admin is responsible for not attaching bogus receipts.

---

## 7. Future Upgrades (v2+ ideas)

Not required in v1, but we might add later:

- **Signature-based receipts**:
  - Require ECDSA/contract signatures from agent or a quorum before accepting a receipt.
- **Quality / score fields**:
  - Add numeric scores (eval results) or references to ModelEvalRegistry.
- **Multi-receipt policies**:
  - Allow multiple receipts per job (e.g. ensemble runs), but add on-chain rules for “canonical” receipt.
- **Tight coupling to JobReceipts.sol**:
  - If JobReceipts is the primary store, ReceiptRegistry can become a thin index + event layer.

---

## 8. Test & Devnet Expectations

For devnet we expect:

- Constructor configured with:
  - `chainId = 2050`
  - `admin   = AdminGate` (devnet instance)
- Basic tests:
  - `attachReceipt` by admin succeeds and stores data correctly.
  - Non-admin calls revert.
  - `getReceiptsForJob` and `getReceiptsForAgent` return the expected lists.
  - Re-attaching an existing `{jobId, receiptId}` updates status/fields as expected.
- Devnet deploy script:
  - Deploys ReceiptRegistry.
  - Wires admin to AdminGate.
  - Writes the address into `docs/VOID-DEVNET-PROTOCOL-STATE.json`.

