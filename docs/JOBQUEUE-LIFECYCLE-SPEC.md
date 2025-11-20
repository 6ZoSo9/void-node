# VOID Devnet – JobQueue / ReceiptRegistry Lifecycle (v1 → v2)

This doc explains how jobs and receipts behave on VOID devnet today (v1),
why we see weird cases like “lots of receipts but pending=true”, and what
the v2 semantics MUST be before mainnet.

It is intentionally minimal and operational, not a full whitepaper.

---

## 1. Current v1 behavior (devnet reality)

Contracts:
- JobQueue        – stores jobs (posted by apps/users).
- ReceiptRegistry – stores receipts from agents/off-chain workers.
- AgentRegistry   – tracks which EOAs/contracts are allowed to act as agents.

Observed on devnet (example jobId = 0x8659…d48b8):

- ReceiptRegistry.totalReceipts() keeps increasing (e.g. 74).
- ReceiptRegistry.getReceiptsForJob(jobId) returns a long list.
- JobQueue.hasResult(jobId) still returns false.
- Our spool helper labels this job as pending, even though many receipts exist.

Why?
- v1 semantics loosely treat hasResult as “JobQueue itself has marked this
  job as having a result”, not “ReceiptRegistry has any entries”.
- Our devnet helpers (void-devnet-agent-submit-*) send receipts to
  ReceiptRegistry directly but do not update JobQueue status.
- Coverage gauges are job-based (>=1 receipt per job) and therefore happy,
  but JobQueue still thinks some jobs are pending.

Conclusion:
- v1 is fine for devnet experiments, but it is internally inconsistent:
  “job pending” vs “job has receipts” diverge.

We are not going to patch this with more bash. We will fix it with a tighter
v2 contract design.

---

## 2. Target v2 semantics (what we want before mainnet)

### 2.1 Concepts

For each jobId:

- Job (JobQueue):
  - Core fields: app, poster, chainId, payloadURI, payloadHash, postedAt, etc.
  - State machine with explicit status:
    - Posted
    - InProgress (optional)
    - Completed
    - Cancelled
    - Expired

- Receipts (ReceiptRegistry):
  - Zero or more entries, all keyed by jobId.
  - Each receipt is a record like:
    - jobId
    - modelId (string)
    - inputHash
    - outputHash
    - modelHash (optional or zero)
    - status (OK / ERROR / PARTIAL, small enum)

- Agents (AgentRegistry):
  - Controls which EOAs/contracts are allowed to submit receipts or mark
    jobs complete.

### 2.2 Hard invariants

For v2, we want the following to ALWAYS be true:

1) Result flag matches receipts

If there exists at least one valid receipt for jobId, then:

- JobQueue.hasResult(jobId) MUST eventually become true.
- JobQueue.getStatus(jobId) SHOULD eventually be Completed (or at least not Posted).

We are allowed to have a small lag (for example via an out-of-band healer
or explicit markResult call), but not permanent divergence.

2) Canonical result is well-defined

There can be many receipts, but there MUST be a clearly defined canonical
“result of record” per job:

- A field on JobQueue such as canonicalReceiptId, or
- A documented convention: “the first successful receipt from an authorized
  agent is treated as canonical.”

We do not need slashing or voting yet, but we do need a stable reference.

3) Multiple receipts are allowed but bounded

- It is fine (and expected) to have multiple receipts for a job on devnet.
- On mainnet, we should have a policy:
  - for example only keep the first N receipts,
  - or allow unlimited but rely on gas/fee economics and off-chain indexing.
- For now, v2 spec simply requires that JobQueue MUST NOT become inconsistent
  when many receipts exist.

---

## 3. How to wire JobQueue ↔ ReceiptRegistry in v2

We have two main options. Both are acceptable; we just need to pick one
and stick to it.

### Option A – ReceiptRegistry notifies JobQueue (push)

- ReceiptRegistry.submitReceipt(...) is the only way to create receipts.
- After validating the sender is a valid agent, it:

  1) Stores the receipt and emits an event.
  2) Calls JobQueue.notifyReceipt(jobId, receiptId).

- JobQueue.notifyReceipt(jobId, receiptId):
  - Requires msg.sender == address(ReceiptRegistry).
  - Sets internal flags such as:
    - hasResult[jobId] = true
    - status[jobId]    = Completed (or similar)
    - canonicalReceiptId[jobId] = receiptId (or first-only rule)

Pros:
- Single call from agents; they do not have to think about JobQueue.
- State stays in sync as long as ReceiptRegistry is honest.

Cons:
- Hard-wires ReceiptRegistry ↔ JobQueue.
- Less flexible if we ever want multiple queues or registries.

### Option B – Agent marks result explicitly (pull)

- ReceiptRegistry.submitReceipt(...) only stores the receipt.
- Agent (or agent framework) then calls JobQueue.markResult(jobId, receiptId).
- markResult checks:
  - Caller is authorized (via AgentRegistry or AdminGate).
  - receiptId exists and belongs to jobId.
  - Then sets:
    - hasResult[jobId] = true
    - status[jobId]    = Completed
    - canonicalReceiptId[jobId] = receiptId

Pros:
- Very explicit: “I am accepting THIS receipt as the canonical result.”
- Works well with future designs (voting, slashing, multiple agents).

Cons:
- Requires two calls in the happy path:
  - submitReceipt
  - markResult

---

## 4. Planned v2 invariants for VOID

For VOID (chainId 2050), the v2 design MUST satisfy:

1) JobQueue.hasResult(jobId) reflects “at least one accepted receipt”
   rather than some internal flag unrelated to ReceiptRegistry.

2) JobQueue.getStatus(jobId) eventually moves out of Posted when a canonical
   result is chosen.

3) There is a stable way to discover that canonical result:
   - Either via JobQueue.getCanonicalReceipt(jobId), or
   - A clearly documented “first receipt wins” rule.

4) Multiple receipts remain allowed for dev purposes, but they do not break
   invariants 1 through 3.

Implementation choice (Option A vs Option B) can be deferred until we refactor
the contracts, but this spec is the bar we hold ourselves to before mainnet.

---

## 5. Devnet v1 vs v2: how to interpret current weirdness

Given the above:

- The current devnet behavior (job has many receipts but hasResult=false)
  is officially classified as v1 devnet semantics only.
- It is acceptable in devnet logs and metrics for now, as long as:
  - Health gauges use receipt counts (coverage), not hasResult.
  - Our ops scripts do not assume pending==0 is required for “healthy”.

When we implement v2 contracts:

- We will:
  - Update JobQueue and ReceiptRegistry per this spec.
  - Update devnet tooling so that:
    - pending means “jobs with no accepted receipts”.
    - JobQueue.hasResult(jobId) and ReceiptRegistry receipts agree.

This doc exists so we do not forget what “correct” looks like when we come
back to refactor the contracts.
