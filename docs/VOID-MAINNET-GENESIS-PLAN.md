# VOID Network – Mainnet Genesis Plan (v1)

This doc sketches the **genesis plan** for VOID mainnet (chainId **2050**).

It does NOT define the full genesis JSON yet; it defines:
- which contracts must exist at or near genesis,
- how they relate to each other,
- what invariants must hold before we call a network “VOID mainnet”.

The idea: by the time we launch mainnet, this file should be nearly identical
to the human-readable version of the real genesis manifest.

---

## 0. High-level goals

- Chain ID: **2050**.
- Network keeps running **without** the MasterKey present.
- MasterKey is only for:
  - wiring / migrating system contracts,
  - protocol update signalling (via UpdateGate),
  - AI policy safety levers (trusted models/datasets, kill-switch for bad agents).
- **Any user** can:
  - deploy arbitrary contracts,
  - use VOID as a normal EVM chain,
  - read all AI registries and job queues permissionlessly.

VOID is AI-centered by default:
- Core AI contracts (JobQueue, AgentRegistry, ModelRegistry, DatasetRegistry,
  ReceiptRegistry) are first-class citizens at or near genesis.
- ConfigGate exposes AI pointers so wallets / agents don’t have to guess.

---

## 1. Core system contracts at/near genesis

These are the “system” contracts that VOID nodes and infra are expected to know
about and/or follow.

### 1.1 Governance / control plane

- **AdminGate**
  - Holds the **MasterKey**.
  - Can wire “system contracts” by key, e.g.:
    - `ADMIN_GATE`
    - `CONFIG_GATE`
    - `UPDATE_GATE`
    - `JOB_QUEUE`
    - `AGENT_REGISTRY`
    - `MODEL_REGISTRY`
    - `DATASET_REGISTRY`
    - `RECEIPT_REGISTRY`
  - Can rotate the MasterKey (with appropriate ceremony).
  - Is _not_ a kill switch: cannot pause consensus or spend user funds by itself.

- **ConfigGate**
  - Holds typed config values (`uint`, `bool`, `address`) keyed by `bytes32`.
  - Writers: **AdminGate** only in v1.
  - Intended usage:
    - Vector7 / WAL thresholds (`WAL_MAX_PRESSURE`, etc.).
    - Block limits (`MAX_BLOCK_GAS` or weight).
    - AI pointers:
      - `AI_JOB_QUEUE_ADDR`
      - `AI_AGENT_REGISTRY_ADDR`
      - `AI_MODEL_REGISTRY_ADDR`
      - `AI_DATASET_REGISTRY_ADDR`
      - `AI_RECEIPT_REGISTRY_ADDR`
    - Policy hints:
      - `AI_DEFAULT_MODEL`
      - `AI_DEFAULT_DATASET`
      - `AI_AGENT_MAX_JOBS`
      - `UPDATE_POLICY_DEFAULT`
  - NO arbitrary external calls, NO consensus pause.

- **UpdateGate**
  - Maintains protocol versions and update manifests.
  - Tracks signers (M-of-N) who can approve an update.
  - Stores:
    - `currentVersion`
    - history of `Update` structs with:
      - `updateId`
      - `manifestHash`
      - `version`
      - `activationHeight`
      - `emergency` flag
      - signer approvals
  - Consulted by nodes that opt-in to “follow canonical protocol versions”.
  - Cannot halt block production by itself.

### 1.2 AI registries + job plane

- **JobQueue**
  - On-chain registry of jobs.
  - Stores:
    - `jobId`
    - `poster`
    - `appId` / `tag`
    - hashes for payload / params
    - status (posted / claimed / completed / cancelled / expired)
  - Emits events so off-chain agents can pick up work.
  - Does not do AI work itself.

- **AgentRegistry**
  - Registry of off-chain agents.
  - Each agent:
    - `agentAddress`
    - `owner`
    - `metadataURI`
    - `active`
    - `trusted` (MasterKey-controlled)
    - timestamps
  - Owner controls metadata + `active`.
  - MasterKey controls `trusted` and emergency deactivation.

- **ModelRegistry**
  - Registry of AI models, keyed by `modelKey` (`bytes32`).
  - Each model:
    - `owner`
    - `versionHash`
    - `metadataURI`
    - `active`
    - `trusted` (MasterKey-controlled)
    - timestamps
  - Open registration in v1 (anyone can register).
  - MasterKey can mark trusted/untrusted and force deactivation.

- **DatasetRegistry**
  - Registry of datasets / corpora, keyed by `datasetKey`.
  - Fields mirror ModelRegistry:
    - `owner`
    - `versionHash`
    - `metadataURI`
    - `active`
    - `trusted`
    - timestamps
  - Used to track what data models are trained on / allowed to use.

- **ReceiptRegistry**
  - Ledger of job receipts:
    - `receiptId`
    - `jobId`
    - `agentId`
    - `modelId`
    - `datasetId`
    - `resultHash`
    - `proofHash`
    - `metadataURI`
    - `status`
    - `submitter`
    - `createdAt`
  - Does **not** enforce correctness.
  - Must be cheap to write; trust / scoring is off-chain.

---

## 2. Boot order / deployment order

When we eventually deploy to real VOID mainnet (chainId 2050), the recommended
order is:

1. Deploy **AdminGate** with:
   - `chainId = 2050`
   - `masterKey = MASTER_KEY_ADDR`
   - `updateGate = address(0)` initially.

2. Deploy **ConfigGate** with:
   - `chainId = 2050`
   - `adminGate = address(AdminGate)`.

3. Deploy **UpdateGate** with:
   - `chainId = 2050`
   - `masterKey = MASTER_KEY_ADDR`
   - signer set seeded (M-of-N; details TBD).

4. Deploy AI registries:
   - `AgentRegistry(masterKey)`
   - `ModelRegistry(masterKey)`
   - `DatasetRegistry(masterKey)`
   - `JobQueue(...)` (constructor TBD; v1 may take no special args)
   - `ReceiptRegistry()` (constructor TBD; v1 may take no special args)

5. Wire AdminGate system contracts:
   - `setSystemContract("ADMIN_GATE",   AdminGate)`
   - `setSystemContract("CONFIG_GATE",  ConfigGate)`
   - `setSystemContract("UPDATE_GATE",  UpdateGate)`
   - `setSystemContract("JOB_QUEUE",    JobQueue)`
   - `setSystemContract("AGENT_REGISTRY",   AgentRegistry)`
   - `setSystemContract("MODEL_REGISTRY",   ModelRegistry)`
   - `setSystemContract("DATASET_REGISTRY", DatasetRegistry)`
   - `setSystemContract("RECEIPT_REGISTRY", ReceiptRegistry)`

6. Seed ConfigGate AI pointers:
   - `setAddress("AI_JOB_QUEUE_ADDR",       JobQueue)`
   - `setAddress("AI_AGENT_REGISTRY_ADDR",  AgentRegistry)`
   - `setAddress("AI_MODEL_REGISTRY_ADDR",  ModelRegistry)`
   - `setAddress("AI_DATASET_REGISTRY_ADDR",DatasetRegistry)`
   - `setAddress("AI_RECEIPT_REGISTRY_ADDR",ReceiptRegistry)`

7. Seed safety / policy defaults via ConfigGate:
   - `setUint("WAL_MAX_PRESSURE", ...)`
   - `setUint("MAX_BLOCK_GAS",    ...)`
   - `setUint("AI_AGENT_MAX_JOBS",...)`
   - `setBool("UPDATE_POLICY_DEFAULT", true/false)` etc.

The **actual concrete values** (signers, limits) live in the runbook +
final manifest, but this ordering is the backbone.

---

## 3. Genesis invariants / sanity checks

Before calling anything “VOID mainnet”:

1. **Contract code hash lock**
   - For each system contract, we record:
     - `bytecodeHash`
     - `constructor args`
   - These must match what’s built by `forge build` at the
     `ckpt-2025-11-14-contracts-v1` tag (or a later explicitly blessed tag).

2. **Chain ID**
   - On-chain chainId must be 2050.
   - Contracts that store `chainId` (AdminGate, ConfigGate, UpdateGate) must
     have `chainId() == 2050`.

3. **MasterKey wiring**
   - `AdminGate.masterKey() == MASTER_KEY_ADDR`.
   - `UpdateGate.masterKey() == MASTER_KEY_ADDR`.
   - All registries using MasterKey must show the same `masterKey`.

4. **System contract wiring via AdminGate**
   - `systemContracts("CONFIG_GATE") == ConfigGate`.
   - `systemContracts("UPDATE_GATE") == UpdateGate`.
   - `systemContracts("JOB_QUEUE") == JobQueue`.
   - `systemContracts("AGENT_REGISTRY") == AgentRegistry`.
   - `systemContracts("MODEL_REGISTRY") == ModelRegistry`.
   - `systemContracts("DATASET_REGISTRY") == DatasetRegistry`.
   - `systemContracts("RECEIPT_REGISTRY") == ReceiptRegistry`.

5. **ConfigGate pointers**
   - All AI pointer keys in ConfigGate match what AdminGate knows.
   - Optional: a “self-check” script that reads both and asserts equality.

6. **Upgradeable but not kill-switch**
   - There is **no single call** from AdminGate / ConfigGate / UpdateGate that
     can:
     - pause consensus,
     - seize arbitrary user funds,
     - make arbitrary external calls to user contracts.
   - Update powers are limited to signalling & pointers.

7. **Registries operational**
   - A dry-run script on a staging network MUST:
     - register an agent,
     - register a model,
     - register a dataset,
     - post a job,
     - write a receipt,
     - mark model/dataset/agent as trusted/untrusted.
   - All of that must pass tests and basic manual checks before mainnet.

---

## 4. Relationship to repos / tags

- Source of truth for contracts: this repo (void-node) under:
  - `contracts/*.sol`
  - `test/*.t.sol`
  - `ops/void-contracts-build.sh`
  - `.github/workflows/contracts-ci.yml`
- Foundry CI:
  - Must be green at the tag used for genesis.
  - Tag example: `ckpt-2025-11-14-contracts-v1`.

When we are closer to mainnet, we’ll add:

- A concrete **deployment manifest** (JSON) including:
  - addresses, tx hashes, bytecode hashes,
  - constructor args,
  - verification URLs.
- A small CLI or script that:
  - deploys these contracts to a target network,
  - verifies them on a block explorer,
  - writes out a `contracts.genesis.json` manifest
    that can be embedded into a VOID genesis file.

---

## 5. Open TODOs before real mainnet

- Decide concrete values for:
  - signer set for UpdateGate (addresses, M-of-N),
  - MasterKey storage / ceremony,
  - WAL / Vector7 defaults,
  - block gas / weight limits,
  - default AI model/dataset flags (if any).
- Write and freeze:
  - a non-interactive deployment script (likely under `ops/`),
  - a verification script that checks all invariants above against a live RPC.
- Align node implementation:
  - have void-node read ConfigGate AI pointers (optional at first),
  - expose them via diagnostics endpoints so agents/wallets can confirm.

This document is the human-readable spec for what a “VOID mainnet genesis”
must satisfy. The actual genesis manifest should be a tighter JSON+/CBOR
encoding of the same facts.
