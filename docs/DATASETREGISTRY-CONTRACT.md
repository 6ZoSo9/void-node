# VOID Network – DatasetRegistry Contract Spec (v1, minimal)

DatasetRegistry is the on-chain directory of datasets used by VOID agents and models.

It does NOT store the dataset itself. It only tracks:
- Which datasets exist
- Who owns them
- What hash/URI describes them
- Whether they are currently active and usable

Nodes and agents may treat this registry as a policy source, but it is not
a consensus rule by itself.

---

## 1. Responsibilities

DatasetRegistry must:

- Store entries keyed by a human-readable datasetId (string).
- Track the current hash and metadata for each dataset.
- Emit events when datasets are registered or updated.
- Allow disabling (deactivating) a dataset without deleting its history.
- Be controlled by an admin address (AdminGate / master-key governed).

DatasetRegistry cannot:

- Guarantee the dataset contents are safe, non-malicious, or high quality.
- Enforce how agents must use a dataset.
- Directly enforce AI safety policies; it only exposes data for those policies.

---

## 2. Data Model

Each dataset is identified by datasetId (string), e.g.:

- void/devnet/dataset:embeddings:test-v1
- nullfeed/devnet/dataset:posts-v1
- lab/devnet/dataset:images:test-2025-11-01

Suggested struct (Solidity-style):

  struct Dataset {
      bytes32 datasetIdHash;  // keccak256(datasetId)
      uint256 chainId;        // 2050 for VOID
      string  datasetId;      // human-readable ID
      address owner;          // who controls updates for this dataset
      string  uri;            // off-chain location (IPFS, HTTPS, VOID storage manifest, etc.)
      bytes32 contentHash;    // hash of the dataset manifest / root
      uint64  createdAt;      // unix timestamp (seconds)
      uint64  updatedAt;      // last update timestamp
      bool    active;         // soft-disable flag
      string  kind;           // short tag, e.g. "embeddings", "text", "images", "metrics"
      string  license;        // SPDX-style or short code ("CC-BY-4.0", "internal", "proprietary")
  }

We keep this intentionally simple: it is a pointer + hash + tags.

---

## 3. Core API (read)

Read-only functions (view):

- function totalDatasets() external view returns (uint256);

- function getDatasetIdAt(uint256 index) external view returns (string memory);
  - Optional helper; allows index-based enumeration.

- function getDataset(bytes32 datasetIdHash) external view returns (Dataset memory);
  - Canonical lookup by keccak256(datasetId).

- function getDatasetById(string calldata datasetId) external view returns (Dataset memory);
  - Convenience lookup; may revert if unknown.

- function isActive(bytes32 datasetIdHash) external view returns (bool);
  - Used by agents to quickly check if a dataset is currently usable.

- function admin() external view returns (address);
  - For health checks and AdminGate alignment.

For devnet + monitoring we primarily care about:

- totalDatasets()
- admin()

These back the Prometheus gauges:

- void_datasets_devnet_total{chain="devnet"}
- void_datasets_admin_mismatch{chain="devnet"} (0 = OK, 1 = mismatch).

---

## 4. Core API (write)

Write functions gated by either owner or admin.

### 4.1 Register dataset

  function registerDataset(
      string calldata datasetId,
      string calldata uri,
      bytes32 contentHash,
      string calldata kind,
      string calldata license
  ) external;

Requirements:

- datasetId non-empty.
- contentHash != 0x0.
- Fails if datasetIdHash already exists.

Effects:

- Creates a new Dataset.
- owner = msg.sender.
- createdAt = updatedAt = block.timestamp.
- active = true.
- Emits DatasetRegistered(datasetIdHash, datasetId, owner).

### 4.2 Update metadata

  function updateDataset(
      string calldata datasetId,
      string calldata newUri,
      bytes32 newContentHash
  ) external;

Requirements:

- Caller is owner OR admin.
- Dataset exists and is not deleted.

Effects:

- Updates uri, contentHash, updatedAt.
- Emits DatasetUpdated(datasetIdHash, datasetId, owner).

### 4.3 Set active flag

  function setDatasetActive(
      string calldata datasetId,
      bool active
  ) external;

Requirements:

- Caller is owner OR admin.

Effects:

- Flips the active flag.
- Emits DatasetActivationChanged(datasetIdHash, datasetId, active).

### 4.4 Transfer ownership

  function transferDatasetOwnership(
      string calldata datasetId,
      address newOwner
  ) external;

Requirements:

- Caller is current owner OR admin.
- newOwner != address(0).

Effects:

- Sets owner = newOwner.
- Emits DatasetOwnerChanged(datasetIdHash, datasetId, oldOwner, newOwner).

---

## 5. Admin / Master-key Integration

DatasetRegistry has a single admin address:

- On VOID devnet, this is the AdminGate contract.
- Ultimate control is via the master-key design:
  - Master key controls AdminGate.
  - AdminGate controls DatasetRegistry (and other system registries).

Admin-only abilities (may be shared with owners):

- Freeze/unfreeze a dataset (setDatasetActive).
- Override URI/contentHash in emergencies (updateDataset).
- Transfer ownership to a recovery address.

Global rule:

- Network persists without master key.
- Master key is only needed to force updates / emergency changes.

---

## 6. Events

Minimal event set:

  event DatasetRegistered(
      bytes32 indexed datasetIdHash,
      string  datasetId,
      address indexed owner
  );

  event DatasetUpdated(
      bytes32 indexed datasetIdHash,
      string  datasetId,
      address indexed owner
  );

  event DatasetActivationChanged(
      bytes32 indexed datasetIdHash,
      string  datasetId,
      bool    active
  );

  event DatasetOwnerChanged(
      bytes32 indexed datasetIdHash,
      string  datasetId,
      address indexed oldOwner,
      address indexed newOwner
  );

These events are intended to be mirrored into our off-chain AI infra:

- Indexers for VOID datasets (for agents and tools).
- Auditing and provenance (which model used which dataset at which version).

---

## 7. Monitoring Hooks (devnet)

Devnet exporter expectations (what void-datasetreg-devnet-health.sh should check):

- void_datasets_devnet_health{chain="devnet"}
  - 1 if:
    - RPC reachable.
    - DatasetRegistry address present in VOID-DEVNET-PROTOCOL-STATE.json.
    - admin() matches the AdminGate address.
  - 0 otherwise.

- void_datasets_devnet_total{chain="devnet"}
  - Mirrors totalDatasets().

- void_datasets_admin_mismatch{chain="devnet"}
  - 1 if admin() != AdminGate, else 0.

---

## 8. Future Extensions (AI-centric)

Later versions can add:

- Per-dataset version registry (datasetId + semantic version).
- Integration with ModelRegistry and JobQueue:
  - Job metadata pointing to both model and dataset ids.
  - On-chain proofs that a given inference used specific dataset snapshots.
- Hooks for:
  - Differential privacy guarantees.
  - Redaction / right-to-forget metadata.
  - Content safety tags (safe_for_training, safe_for_inference, etc.).

For now, v1 remains simple: a clean, on-chain directory for AI datasets,
governed by AdminGate + master key, but usable by anyone posting jobs on VOID devnet.
