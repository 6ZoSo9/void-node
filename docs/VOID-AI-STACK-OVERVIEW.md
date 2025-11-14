# VOID Network – AI Stack Overview (v1)

This doc explains how the core AI-related contracts fit together for VOID:

- JobQueue
- AgentRegistry
- ModelRegistry
- DatasetRegistry
- ReceiptRegistry

These are **app-layer contracts**. They do NOT control consensus or halt the chain. They sit beside AdminGate / UpdateGate / ConfigGate and are read by agents, wallets, and off-chain infra.

---

## 1. JobQueue

JobQueue is the on-chain job registry.

- Users / dApps post jobs with:
  - `jobId` (assigned by JobQueue),
  - `poster`,
  - `app` tag (bytes32),
  - `payloadHash` (hash of off-chain request),
  - timestamps + status.
- Agents claim jobs, complete jobs, and JobQueue tracks state transitions.

JobQueue does not:
- Execute AI code.
- Guarantee quality of outputs.
- Force any agent to do work.

It is a durable, append-only job log.

---

## 2. AgentRegistry

AgentRegistry is the registry of off-chain agents.

- Any address can register itself as an agent.
- Tracks:
  - `agentId`,
  - `agentAddress`,
  - `owner`,
  - `metadataURI`,
  - `active`,
  - `trusted`,
  - timestamps.
- Owner can update metadata and `active`.
- MasterKey can:
  - flip `trusted`,
  - force `active` (emergency off),
  - transfer ownership,
  - rotate MasterKey.

Agents read jobs from JobQueue and publish results/receipts.

---

## 3. ModelRegistry

ModelRegistry is the registry of AI models.

- Each model has:
  - `modelKey` (bytes32 stable key),
  - `owner`,
  - `versionHash`,
  - `metadataURI`,
  - `active`,
  - `trusted`,
  - timestamps.
- Owner can:
  - update version + metadata,
  - toggle `active`.
- MasterKey can:
  - toggle `trusted`,
  - force `active`,
  - transfer ownership,
  - rotate MasterKey.

Models referenced in jobs and receipts use `modelId`.

---

## 4. DatasetRegistry

DatasetRegistry is the registry of datasets.

- Each dataset has:
  - `datasetKey`,
  - `owner`,
  - `contentHash`,
  - `metadataURI`,
  - `active`,
  - `trusted`,
  - timestamps.
- Owner can:
  - update `contentHash` + metadata,
  - toggle `active`.
- MasterKey can:
  - toggle `trusted`,
  - force `active`,
  - transfer ownership,
  - rotate MasterKey.

Datasets referenced by models or jobs use `datasetId`.

---

## 5. ReceiptRegistry

ReceiptRegistry is the on-chain log of job receipts.

- Each receipt links:
  - `jobId` (JobQueue),
  - `agentId` (AgentRegistry),
  - `modelId` (ModelRegistry),
  - `datasetId` (DatasetRegistry),
  - `resultHash`,
  - `proofHash`,
  - `metadataURI`,
  - `status`,
  - `submitter`,
  - `createdAt`.
- Anyone can record a receipt.
- The original submitter can update it (better proof / metadata).

ReceiptRegistry does NOT verify the proof; VOID agents / infra do.

---

## 6. Governance split

- **AdminGate / UpdateGate / ConfigGate**:
  - MasterKey, protocol version, config parameters.
- **AI stack (these 5 contracts)**:
  - Jobs, agents, models, datasets, receipts.
  - Mostly open registration with MasterKey knobs for trust and emergency controls.

Nodes are free to:
- Hard-follow these contracts as policy,
- Or treat them as advisory + local overrides.

This keeps VOID permissionless while still giving the MasterKey a way to steer AI infra safely.
