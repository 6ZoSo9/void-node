# VOID Network – Agent OS v1 Overview

This document defines how VOID's on-chain contracts form an **Agent OS** for
AI agents and off-chain workers.

Agent OS v1 is built from:

- AgentRegistry (existing, v0/v1 in code)
- JobQueue (new, v1)
- ModelRegistry (new, v1)
- Policy tags (bytes32 hints interpreted by PolicyGuard and off-chain agents)
- Future: ModelEvalRegistry, PolicyRegistry, AdvisoryRegistry, DatasetRegistry

---

## 1. Goals

Agent OS v1 should let us:

- Register models and look them up by human-readable IDs.
- Post structured jobs to the chain.
- Let agents claim and complete jobs, with receipts recorded on-chain.
- Attach policy and app tags so higher-level systems can enforce rules.
- Keep the contracts simple enough to deploy on VOID devnet today.

---

## 2. Core components

### 2.1 AgentRegistry (existing)

Purpose:

- Track which off-chain agents are allowed to act under certain roles.
- Store basic agent metadata and receipt history.

Status:

- Already implemented in the golden baseline (allowlist + receipts).
- Not redefined here; Agent OS v1 assumes "AgentRegistry v0+" exists.

Usage:

- Job processors should be registered as agents.
- Off-chain infra can use AgentRegistry data to:
  - decide which jobs an agent may claim
  - track reputation, success rate, etc.

### 2.2 JobQueue (new)

Purpose:

- On-chain job registry for AI and off-chain work.

Key ideas:

- Jobs have:
  - poster (EOA or contract)
  - appTag (bytes32, e.g. "NULLFEED", "VOID_OS")
  - payloadType (string, e.g. "json://void.ai/EmbeddingRequest/v1")
  - payloadHash (bytes32, off-chain payload)
  - modelHint (string modelId from ModelRegistry, optional)
  - policyTag (bytes32)
  - budget (uint256, optional, informational in v1)
  - createdAt, expiresAt
  - status (Posted, Claimed, Completed, Cancelled, Expired)
  - claimer, receiptHash, receiptMeta
  - parentJobId + stepIndex for simple DAGs

Lifecycle:

- postJob: anyone can post a job.
- claimJob: any caller can claim (v1); later tied to AgentRegistry.
- completeJob: claimer (or admin) completes with a receipt hash.
- cancelJob: poster or admin can cancel.
- markExpired: admin helper to mark obviously expired jobs.

Off-chain responsibilities:

- Agents watch JobPosted events.
- Filter by appTag, payloadType, modelHint, policyTag.
- Claim jobs they are capable of handling.
- Write receipts that reference:
  - model used
  - dataset (if relevant)
  - policy verdicts (if any)
  - status/error codes

### 2.3 ModelRegistry (new)

Purpose:

- On-chain directory of models available to agents.

Key data:

- modelId (string, human-readable)
- latestVersion (uint64)
- versions[version]:
  - hash (bytes32)
  - uri (string)
  - policyTag (bytes32)
  - metadata (string, e.g. JSON)
  - active (bool)
- owner (address)
- admin (address or AdminGate)

Lifecycle:

- First registration:
  - admin-only to avoid random squatting.
- New versions:
  - owner or admin can add versions.
- Updates:
  - owner/admin can update uri/metadata/policyTag.
- Activation:
  - owner/admin can toggle active flag per version.
- Ownership:
  - owner/admin can transfer model ownership.

Typical agent flow:

1. Find modelId from a job's modelHint or configuration.
2. Resolve to latestVersion.
3. Check active flag.
4. Pull hash, uri, policyTag, metadata.
5. Load the model from uri and verify hash off-chain.

---

## 3. Policy tags

Agent OS v1 treats `policyTag` as a generic bytes32 hint.

Sources:

- Jobs in JobQueue have a policyTag.
- Model versions in ModelRegistry have a policyTag.
- Agents in AgentRegistry may also be tagged with policies.

Interpretation:

- Handled by PolicyGuard and off-chain agents.
- On-chain contracts (JobQueue, ModelRegistry) only store the tag.

Examples:

- policyTag = keccak256("VOID_POLICY_SFW_V1")
- policyTag = keccak256("VOID_POLICY_FINANCE_V1")

Agents and higher-level services can enforce:

- "Only run jobs whose policyTag is in my supported set."
- "Only use models whose policyTag is compatible with this job's tag."

---

## 4. Basic Agent OS flow

### 4.1 Posting a job

1. A user or dApp contract calls JobQueue.postJob:
   - Sets appTag to identify the dApp (e.g. NULLFEED)
   - Provides payloadType + payloadHash
   - Optionally sets modelHint and policyTag
   - Optionally sets budget and expiresAt

2. JobQueue emits JobPosted.

3. Off-chain indexers record the job, and agents see it in their feeds.

### 4.2 Claiming and executing

1. Agents scan JobPosted events and filter:
   - appTag they support
   - payloadType they understand
   - modelHint they can serve (via ModelRegistry)
   - policyTag they agree to enforce

2. An agent calls JobQueue.claimJob(jobId):
   - If successful, the job moves to Claimed.

3. Off-chain, the agent:
   - Pulls job details from JobQueue.
   - Resolves modelHint via ModelRegistry.
   - Loads and runs the model.
   - Optionally consults datasets, vector search, etc.

### 4.3 Completing with a receipt

1. After execution, the agent produces a result object off-chain:
   - output hash
   - status/error codes
   - modelId + version
   - any policy checks or eval metrics

2. The agent hashes the result and calls JobQueue.completeJob:
   - Sets receiptHash and receiptMeta.

3. Off-chain indexers and dashboards can:
   - Link job -> model -> agent -> receipt.
   - Audit or re-run jobs if needed.

---

## 5. Admin and safety

Admin concepts:

- JobQueue.admin:
  - Can cancel or markExpired jobs.
  - Can override completion in emergencies.
- ModelRegistry.admin:
  - Can register new modelIds initially.
  - Can transfer ownership in emergencies.

In VOID, admin addresses are expected to be controlled by AdminGate and
ultimately by the VOID master key design, not by random EOAs.

Safety notes:

- v1 keeps claimJob open to any caller:
  - Real deployments should enforce that agents are registered and policies
    are compatible.
- v1 does not handle payments or slashing:
  - Those live in separate rewards/escrow contracts.

---

## 6. Future extensions

Agent OS v1 is intentionally minimal. Future components:

- ModelEvalRegistry:
  - Link models to eval suites and scores.

- PolicyRegistry:
  - Store policy definitions and machine-readable rules.

- DatasetRegistry:
  - Track datasets, licenses, and provenance.

- AdvisoryRegistry:
  - Store AI advisory opinions on protocol updates and configs.

- SafetyReviewQueue:
  - Special JobQueue for safety/red-team tasks.

These will be designed as additive contracts that plug into the same
Agent OS pattern: jobs + models + policies + receipts.
