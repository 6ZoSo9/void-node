# VOID System Contracts – Overview (v1)

This document summarizes the core "system contracts" used for VOID devnet/mainnet.

These contracts live on an EVM chain (devnet: Anvil, chainId 2050) and coordinate:
- protocol governance / configuration,
- token supply,
- validator set,
- AI agents, models, datasets,
- on-chain job/receipt tracking for off-chain AI work.

See individual specs for details:
- `VOID-KEY-MODEL-V1.md`
- `JOBQUEUE-CONTRACT.md`
- `AGENTREGISTRY-CONTRACT.md`
- `DATASETREGISTRY-CONTRACT.md`
- `MODELREGISTRY-CONTRACT.md`
- `VOID-DEVNET-SYSTEM-CONTRACTS-PLAN-V1.md`
- `VOID-DEVNET-PLAYBOOK-V1.md`

---

## 1. Core Governance / Config

### 1.1 VoidToken

- ERC20 for VOID / VoidStones.
- Controls total supply cap and premine.
- Owner (governance) may mint up to cap.
- Used for fees, staking, and incentives later.

(See `VoidToken.t.sol` and devnet docs for exact numbers.)

### 1.2 AdminGate

- ChainId-aware "master gate" contract.
- Holds the **master key** (governance key).
- Can:
  - update the master key,
  - register/update "system contracts" (ValidatorSet, ConfigGate, registries),
  - act as a root-of-trust for other contracts.

Nodes and off-chain agents treat AdminGate state as the canonical on-chain view
of "who is allowed to do what" at the protocol level.

### 1.3 ConfigGate

- Small key/value store for chain-wide settings.
- Keys: uint / bool / address config flags and system addresses.
- AdminGate / governance controls writes.
- Read-only for everyone else.

Used for:
- enabling/disabling protocol features,
- pointing VOID nodes to canonical system addresses,
- toggling safe-mode / emergency flags, etc.

### 1.4 ValidatorSet

- Tracks validators and their stake.
- Holds:
  - validator addresses,
  - stake amounts,
  - active/inactive flags.
- Controlled by governance + staking logic (future).

VOID nodes will eventually read this contract (or a derived snapshot)
as part of consensus and fork-choice rules.

---

## 2. AI & Data Registry Layer

These contracts describe **who/what** participates in AI jobs, not the jobs themselves.

### 2.1 AgentRegistry

- Registry of agents (wallet agents, relayers, AI workers).
- Fields per agent:
  - owner,
  - metaHash (capabilities, endpoint, policy),
  - active (owner-controlled),
  - trusted (governance-controlled).
- Off-chain infra uses this to:
  - filter which agents can claim jobs,
  - route work to trusted actors.

### 2.2 DatasetRegistry

- Registry of datasets that models/agents can use.
- Fields per dataset:
  - owner,
  - metaHash (manifest/policy hash),
  - active,
  - trusted.
- Used to:
  - whitelist datasets,
  - attach policies and licenses,
  - drive off-chain storage/indexing.

### 2.3 ModelRegistry

- Registry of AI models.
- Fields per model:
  - owner,
  - metaHash (model manifest, version, license, evals),
  - active,
  - trusted.
- Future linkage:
  - references to datasets (by id),
  - evaluation / provenance hashes,
  - Proof-of-Processing receipts from job executions.

---

## 3. Job Queue & Receipts

### 3.1 JobQueue

- On-chain job registry for AI / off-chain work.
- Stores:
  - who posted the job,
  - payload hash / manifest reference,
  - requested agent/model/dataset ids (optional),
  - lifecycle state: Posted → Claimed → Completed / Cancelled / Expired.
- Emits events so off-chain runners can:
  - discover new jobs,
  - claim them,
  - publish receipts.

### 3.2 Receipts (future)

- Minimal on-chain record that some job was executed.
- Fields will include:
  - jobId,
  - agentId,
  - result hash / manifest,
  - status / error code,
  - optional references to model/dataset versions.

Receipts will later connect to:
- ModelRegistry (which model version),
- DatasetRegistry (which datasets),
- off-chain proofs (PoP / ZK / TEE).

---

## 4. How VOID Nodes Use These Contracts

At mainnet time, VOID nodes are expected to:

- Read AdminGate + ConfigGate at boot to discover system contract addresses.
- Respect ValidatorSet for consensus / validator membership.
- Treat AgentRegistry / ModelRegistry / DatasetRegistry as **policy inputs**
  for:
  - which jobs are valid,
  - which agents are allowed for certain classes of work,
  - which models/datasets are allowed under which policies.
- Follow JobQueue events and receipts as the canonical on-chain record
  of off-chain AI activity (what was requested, by whom, and what was returned).

The exact wiring from node → contracts will be defined in future specs, but
this document is the high-level map of the system contracts we are standardizing
for VOID devnet and future mainnet.
