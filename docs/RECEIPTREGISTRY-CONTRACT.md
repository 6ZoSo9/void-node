# VOID Network – ReceiptRegistry Contract Spec (v1, minimal)

ReceiptRegistry is the **on-chain receipt log** for VOID devnet/mainnet.

It does NOT run AI jobs. It only records **what came back** from agents or
off-chain workers for a given `jobId`.

Typical questions it should answer:

- "Does this job have any receipts yet?"
- "How many receipts exist for this job?"
- "What URI/hash describes the latest result?"
- "Who submitted the receipt and when?"

---

## 1. Responsibilities

ReceiptRegistry must:

- Track **receipts keyed by jobId** (and optionally a separate receiptId).
- Allow multiple receipts per job (for retries, competing agents, etc.).
- Emit events when receipts are recorded so off-chain infra can index them.
- Be controlled by an admin / policy layer (e.g., AdminGate + AgentRegistry),
  at least for dangerous operations (purge, override, etc.).
- Expose read functions for:
  - `receiptsTotal()`
  - `getReceipts(jobId)` or `getReceipt(jobId, idx)`
  - `hasReceipt(jobId)` or `hasResult(jobId)`

ReceiptRegistry cannot:

- Force agents to actually do any work.
- Judge correctness of AI outputs (that is a higher-level policy problem).
- Directly move user funds or touch JobQueue balances.

---

## 2. Minimal interface (conceptual)

**NOTE:** Exact function signatures are defined by the Solidity implementation.
This file describes the *intent* of the interface we rely on for devnet.

We assume a minimal shape like:

- `function totalReceipts() external view returns (uint256);`
- `function receiptsFor(bytes32 jobId) external view returns (uint256);`
- `function hasResult(bytes32 jobId) external view returns (bool);`
- `function getReceipt(bytes32 jobId, uint256 index) external view returns (
      bytes32 jobId,
      address agent,
      string memory resultURI,
      bytes32 resultHash,
      uint64  createdAt,
      uint8   status
  );`

And one primary write function, conceptually:

- `function recordReceipt(
      bytes32 jobId,
      string calldata resultURI,
      bytes32 resultHash
  ) external returns (bytes32 receiptId);`

On devnet, we are tolerant of this evolving as long as:

- JobQueue and coverage tools can still answer:
  - "Does this job have >=1 receipt?"
  - "How many receipts exist in total?"
- The ReceiptRegistry address stays stable in the devnet state file:
  `docs/VOID-DEVNET-PROTOCOL-STATE.json` under `.ReceiptRegistry.address`.

---

## 3. Events

At minimum, ReceiptRegistry should emit:

- `event ReceiptRecorded(
      bytes32 indexed jobId,
      bytes32 indexed receiptId,
      address indexed agent,
      string  resultURI,
      bytes32 resultHash,
      uint64  createdAt,
      uint8   status
  );`

Indexing `jobId` and `receiptId` lets off-chain infra quickly find all
receipts for a given job and correlate them to logs.

---

## 4. Admin / policy

ReceiptRegistry should be governed by an admin / master-key layer:

- Admin may:
  - Pause/unpause new receipts (emergency only).
  - Mark certain agents as disallowed (integrate with AgentRegistry).
  - Optionally mark certain receipts as invalid / superseded.

- Normal agents may:
  - Call `recordReceipt` for jobs they are allowed to serve.

The final mainnet design will likely route authority through AdminGate and
AgentRegistry; devnet v1 may be simpler as long as we can upgrade later.

---

## 5. Devnet invariants we care about

For VOID devnet, monitoring enforces:

- `void_devnet_receipts_total_v2 >= void_devnet_jobs_total_v2`
- `void_devnet_receipts_health_v2 == 1`
- `void_devnet_coverage == 1` (every job has >=1 receipt)

ReceiptRegistry **must not** break these core invariants when we iterate:

- Posting a receipt for a job that already has one should be allowed, but
  must not silently erase history.
- Removing receipts (if ever allowed) must be rare and observable (events).

This doc is a **living spec**. As we evolve the Solidity contract, we will
update this file but keep the devnet invariants and monitoring semantics
stable across versions.
