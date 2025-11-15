# VOID Devnet – Job Flow v1

This document describes a minimal end-to-end **job flow** on the VOID devnet
(chainId 2050) using the current system contracts and registries.

⚠️ Status: **Design-level**. The contracts exist (see tests), but this doc
does not assume any particular deployment script for JobQueue/registries yet.

---

## 1. Actors

- **User / dApp** – wants some AI work done.
- **Agent** – off-chain worker (wallet agent, relayer, AI worker).
- **Model** – AI model referenced by jobs (via ModelRegistry).
- **Dataset** – optional dataset used by the model (via DatasetRegistry).
- **JobQueue** – on-chain registry for jobs + receipts.
- **AdminGate / ConfigGate** – system governance + config.

---

## 2. Happy-Path Flow (Conceptual)

1. **Admin config** (once per network / upgrade):
   - AdminGate is set up with:
     - `ValidatorSet`
     - `ConfigGate`
     - `AgentRegistry`
     - `DatasetRegistry`
     - `ModelRegistry`
     - `JobQueue`
   - ConfigGate holds whatever feature flags / limits we need.

2. **Agent registration**:
   - Agent owner calls `AgentRegistry.registerAgent(metaHash, active=true)`.
   - Registry stores:
     - `owner`
     - `metaHash` (agent manifest / capabilities hash)
     - `active=true`
     - `trusted=false` by default.
   - Governance can later call `setTrusted(agentId, true)` for good actors.

3. **Model registration**:
   - Model owner calls `ModelRegistry.registerModel(metaHash, active=true)`.
   - `metaHash` points to model manifest (arch, version, license, weights hash).
   - Governance can flag trusted models.

4. **Dataset registration** (optional):
   - Dataset owner calls `DatasetRegistry.registerDataset(metaHash, active=true)`.
   - `metaHash` points to dataset manifest (policy, license, hashes, location).
   - Governance can whitelist datasets for certain use cases.

5. **User posts a job**:
   - User / dApp builds off-chain payload:
     - input hashes,
     - desired model/dataset ids,
     - policy hints, etc.
   - They compute `payloadHash` (e.g. keccak256 over a CBOR/JSON manifest).
   - They call `JobQueue.postJob(payloadHash, options...)` with:
     - optional target agentId/modelId/datasetId(s),
     - optional max fee / timeout params.
   - JobQueue assigns `jobId` and emits `JobPosted(jobId, ...)`.

6. **Agent claims job**:
   - Off-chain agent watches `JobPosted` events.
   - It filters jobs based on:
     - its own capabilities (from `metaHash`),
     - allowed models/datasets,
     - trust policies.
   - Agent calls `JobQueue.claimJob(jobId)` (if allowed by policy).
   - JobQueue updates state and emits `JobClaimed(jobId, agentId, ...)`.

7. **Agent executes off-chain work**:
   - Agent fetches actual compressed+encrypted payload from VOID’s data layer.
   - Runs the AI model (off-chain, possibly with TEE / ZK later).
   - Produces an output payload + `resultHash` (manifest / output hash).

8. **Agent posts receipt**:
   - Agent calls `JobQueue.completeJob(jobId, resultHash, statusCode, aux…)`.
   - JobQueue:
     - verifies caller = claimed agent,
     - marks job `Completed`,
     - stores `resultHash` and status,
     - emits `JobCompleted(jobId, agentId, resultHash, statusCode)`.

9. **Consumer verifies result**:
   - Off-chain consumer fetches:
     - job metadata,
     - receipt `resultHash`,
     - off-chain output using that hash.
   - They verify:
     - hash matches,
     - agent/model/dataset ids match their policy,
     - any external proofs (TEE / ZK / PoP) if provided.

---

## 3. How This Maps to Current Devnet

Today we have:

- **Contracts + tests**:
  - `VoidToken`
  - `AdminGate`
  - `ConfigGate`
  - `ValidatorSet`
  - `JobQueue`
  - `AgentRegistry`
  - `DatasetRegistry`
  - `ModelRegistry`

- **Devnet stack**:
  - `ops/void-devnet-stack.sh` (tests + deploy + premine verify)
  - `ops/void-devnet-bootstrap-protocol.sh` (protocol snapshot)
  - `ops/void-devnet-protocol-verify.sh` (snapshot vs live)
  - `ops/void-devnet-system-bootstrap.sh` (AdminGate masterKey)
  - `ops/void-devnet-bootstrap-stack.sh` (full stack)
  - Docs under `docs/VOID-DEVNET-*` and `docs/*REGISTRY-CONTRACT.md`.

What we **do not** have yet:

- A standardized **JobQueue deployment** in devnet scripts.
- A standardized deployment for:
  - AgentRegistry
  - DatasetRegistry
  - ModelRegistry
- A demo script that:
  - registers an agent/model/dataset,
  - posts a job,
  - simulates a claim + completion.

Those will be added in future `ops/void-devnet-*` helpers:

- `ops/void-devnet-deploy-registries.sh`
- `ops/void-devnet-job-demo.sh`

This file is the conceptual contract for that work.
