# VOID Network – Agent Protocol v1 (Off-Chain Agents)

This document defines the baseline protocol for off-chain agents that work with VOID:

- JobQueue
- AgentRegistry
- ModelRegistry
- DatasetRegistry
- ReceiptRegistry
- ConfigGate (for pointers and policy)

Agents are off-chain services. They:
- Watch JobQueue for jobs they care about.
- Execute work using registered models/datasets.
- Publish receipts to ReceiptRegistry and/or back into JobQueue.

This is v1: deliberately simple, HTTP+JSON oriented, no staking/reputation yet.

---

## 1. Agent identity

Each agent:

- Has an EOA or contract address on VOID used as `agentAddress`.
- Registers in `AgentRegistry` via `registerAgent(string metadataURI)`.
- Receives a stable `agentId` (1-based).

`metadataURI` should point to JSON with at least:

    {
      "name": "void-agent-example",
      "version": "1.0.0",
      "description": "Example VOID agent",
      "capabilities": ["chat", "code", "image"],
      "models": ["void-gpt-1"],
      "datasets": ["void-commoncrawl-1"],
      "endpoint": "https://agent.example.com",
      "owner": "0x...",
      "contact": "mailto:ops@example.com"
    }

On-chain flags:

- `active == true`  → agent is open for jobs.
- `trusted == true` → MasterKey / governance has vetted this agent.

---

## 2. Discovery via ConfigGate

Agents and wallets should discover canonical contracts via ConfigGate:

- `VOID_AI_JOBQUEUE`         → JobQueue address
- `VOID_AI_AGENT_REGISTRY`   → AgentRegistry address
- `VOID_AI_MODEL_REGISTRY`   → ModelRegistry address
- `VOID_AI_DATASET_REGISTRY` → DatasetRegistry address
- `VOID_AI_RECEIPT_REGISTRY` → ReceiptRegistry address

Policy hints (optional):

- `VOID_AI_MAX_JOBS_PER_BLOCK`
- `VOID_AI_MAX_JOB_TTL_BLOCKS`
- `VOID_AI_ALLOW_UNTRUSTED_AGENTS`
- `VOID_AI_ALLOW_UNTRUSTED_MODELS`

If any pointer is zero, implementations should treat that feature as disabled or dev-only.

---

## 3. Pull loop (job intake)

Baseline v1 pull loop (off-chain):

1. Read new jobs from JobQueue logs:
   - Filter by `app` tag (bytes32).
   - Respect local capacity and policy (max parallel jobs, rate limits).

2. For each candidate job, read:
   - `jobId`, `poster`, `app`, `payloadHash`, `createdAt`, `status`.
   - Optionally resolve an application-specific payload via off-chain storage.

3. If the agent accepts the job:
   - Call `JobQueue.claimJob(jobId)` from the agent’s on-chain address.
   - If the tx fails (race), treat as “lost race” and move on.

Agents should implement backoff / rate limiting when scanning jobs to avoid hammering nodes.

---

## 4. Off-chain execution contract

For each claimed job, the agent should:

- Resolve which model / dataset to use:
  - Derive `modelKey` / `datasetKey` from app or metadata.
  - Read ModelRegistry / DatasetRegistry entries by id or key.
- Check trust flags if local policy requires:
  - Only use `trusted == true` models/datasets when configured that way.
- Enforce local safety / policy:
  - Content filters, rate limits, prompt guards, etc.
- Execute the job with the selected model + dataset.
- Produce an off-chain receipt object, for example:

    {
      "jobId": 123,
      "agentId": 7,
      "modelId": 3,
      "datasetId": 2,
      "status": "Success",
      "resultCid": "ipfs://... or https://... or void://...",
      "proofCid": "ipfs://... optional",
      "metrics": {
        "latencyMs": 1234,
        "tokensIn": 512,
        "tokensOut": 1024
      },
      "timestamp": "<ISO8601>",
      "version": "agent-protocol-v1"
    }

This JSON is not stored on-chain directly; we only commit hashes + URIs.

---

## 5. On-chain completion and receipts

Typical v1 flow:

1. Compute hashes:

   - `resultHash = keccak256(result payload or manifest)`.
   - `proofHash  = keccak256(proof bundle)` or `bytes32(0)` if none.
   - Optionally hash the full receipt JSON.

2. Complete job on JobQueue:

   - `JobQueue.completeJob(jobId, receiptHash)` where `receiptHash` is:
     - hash of the off-chain receipt document, or
     - hash of encoded fields for ReceiptRegistry.

3. Record a receipt on ReceiptRegistry:

   - `ReceiptRegistry.recordReceipt(
        jobId,
        agentId,
        modelId,
        datasetId,
        resultHash,
        proofHash,
        metadataURI,
        statusEnum
     )`

Where:

- `metadataURI` points to the full off-chain receipt JSON.
- `statusEnum` might be:
  - `Success` → `ReceiptStatus.Success`
  - `Failed`  → `ReceiptStatus.Failed`
  - `Partial` → `ReceiptStatus.Partial`

---

## 6. HTTP API expectations (soft spec)

Agents should expose a simple HTTP API:

1. Health

   - `GET /health`
   - Returns JSON like: `{ "status": "ok", "version": "1.0.0" }`.

2. Info

   - `GET /info`
   - Returns JSON summarizing:
     - supported apps / capabilities,
     - models/datasets,
     - current load,
     - on-chain addresses (agent, registry ids).

3. Job preview (optional)

   - `POST /preview`
   - Input: job payload (decoded from off-chain storage).
   - Output: rough estimate of cost, latency, safety flags, can/can’t execute.

4. Admin (optional, authenticated)

   - Endpoints to:
     - rotate keys,
     - change metadata,
     - pause/resume agent.

Endpoints are not standardized yet; they only need to be documented in `metadataURI`.

---

## 7. Safety and policy

Each agent implementation must own its own safety policy:

- Prompt / output filters.
- Rate limits per user / per app.
- Abuse detection (spam, prompt injection, exploit attempts).
- Logging and audit trails (local or remote).

VOID on-chain contracts are agnostic to safety policy; they only record:

- Jobs posted,
- Agents registered,
- Models/datasets registered,
- Receipts recorded.

Off-chain infra, wallets, and nodes can use:

- `trusted` flags,
- local policy,
- metrics and historical receipts

to decide which agents/models/datasets to trust.

---

## 8. Future extensions (v2+)

Planned directions beyond v1:

- Agent staking / slashing via additional contracts.
- Reputation / scoring and job routing.
- Richer receipt proofs (TEEs, ZK proofs, PoP).
- Workflows / DAGs in JobQueue.
- Per-app / per-tenant agent registries.

v1 keeps the surface small so we can ship VOID mainnet 1, then iterate.
