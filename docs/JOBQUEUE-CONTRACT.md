# VOID Network – JobQueue Contract Spec (v1, minimal)

JobQueue is the **on-chain job registry** for VOID (chainId 2050).

- Users / contracts can post **jobs** for AI agents and off-chain workers.
- Off-chain VOID agents read jobs, execute them, and write back **receipts**.
- The chain does *not* execute the AI – it tracks **what was requested** and **what was returned**.

JobQueue cannot:
- Force agents to run off-chain work.
- Guarantee the quality of AI outputs.
- Directly control user balances or external chains.

It can:
- Store job metadata (who posted, what app, what payload hash).
- Track job lifecycle (posted → claimed → completed → cancelled).
- Emit events for off-chain agent infrastructure.
- Store minimal on-chain results (receipt hash, status, metadata).

---

## 1. Responsibilities

JobQueue must:

- Accept new jobs from any caller (subject to future fee / stake policy).
- Assign each job a unique `jobId` and persist:
  - `poster` address,
  - `app` (`bytes32` tag, e.g. `keccak256("VOID_AGENT_CHAT")`),
  - `payloadHash` (`bytes32`, hash of off-chain request),
  - `createdAt` block number,
  - `updatedAt` block number,
  - `status` (`JobStatus` enum),
  - `agent` address (the claimer, if any),
  - `receiptHash` (`bytes32`, hash of result / receipt, once completed).

- Support job lifecycle:
  - `Post`     – user posts a new job.
  - `Claim`    – an agent marks a job as "in progress".
  - `Complete` – the agent posts a receipt hash + final status.
  - `Cancel`   – poster cancels while still unclaimed.

- Emit events for each transition so off-chain infrastructure can tail logs.

JobQueue must *not* include consensus or protocol upgrade logic. It is just an app-level contract that nodes and agents may follow.
