# VOID Network – ModelRegistry Contract Spec (v1, minimal)

ModelRegistry is the on-chain directory of AI models used by VOID agents.

It does NOT run the models or verify outputs. It only tracks:
- Which models exist
- Who owns them
- What hash/URI describes them
- Whether they are currently active

Nodes and agents may treat this registry as a policy source, but it is not
a consensus rule by itself.

---

## 1. Responsibilities

ModelRegistry must:

- Store entries keyed by a human-readable modelId (string).
- Track the current hash and metadata for each model.
- Emit events when models are registered or updated.
- Allow disabling (deactivating) a model without deleting its history.
- Be controlled by an admin address (typically an AdminGate or master-key
  governed contract).

ModelRegistry cannot:

- Guarantee that an off-chain model implementation actually matches the
  declared hash or behaves as claimed.
- Enforce quality, safety, or licensing on its own.
- Run inference or verify outputs.

Those responsibilities belong to off-chain agents, PolicyGuard, and other
higher-level components.

---

## 2. Data model

### 2.1 Types

- ModelId – string (e.g. "gpt4x-mini-2025-01", "void-embed-v2")
- ModelVersion – uint64 incremental version
- Hash – bytes32 (content hash of model artifact or manifest)
- Uri – string (IPFS/HTTPS/S3/etc.)
- Owner – address
- PolicyId – bytes32 (optional policy tag reference)
- Metadata – string (JSON recommended)

### 2.2 Storage (conceptual)

For each modelId:

- owner: address
- latestVersion: uint64
- versions[version] with:
  - hash: bytes32
  - uri: string
  - policyTag: bytes32
  - metadata: string
  - active: bool

Additional:

- isRegistered[modelId] -> bool
- admin: address (or AdminGate reference)

---

## 3. Core functions

### 3.1 registerModel

Signature (conceptual):

- registerModel(modelId, hash, uri, policyTag, metadata)

Behavior:

- If modelId is new:
  - owner = msg.sender (or admin, depending on config)
  - latestVersion = 1
- If modelId already exists:
  - latestVersion += 1
- In all cases:
  - Create versions[latestVersion] entry
  - Set active = true
- Emit ModelRegistered event.

### 3.2 updateModelMeta

- updateModelMeta(modelId, version, uri, metadata, policyTag)

Requirements:

- isRegistered[modelId] == true
- version exists
- caller is owner or admin

Effects:

- Update uri, metadata, policyTag for that version
- Emit ModelUpdated event.

### 3.3 setModelActive

- setModelActive(modelId, version, active)

Requirements:

- caller is owner or admin

Effects:

- Flip versions[version].active to the given value
- Emit ModelActivationChanged event.

### 3.4 transferModelOwnership

- transferModelOwnership(modelId, newOwner)

Requirements:

- caller is current owner or admin

Effects:

- owner = newOwner
- Emit ModelOwnershipTransferred event.

---

## 4. View functions (for agents)

Read-only helpers:

- getModelOwner(modelId) -> address
- getLatestVersion(modelId) -> uint64
- getModelVersion(modelId, version) ->
  (hash, uri, policyTag, metadata, active)
- getActiveVersion(modelId) -> uint64 (0 if none active)
- isModelActive(modelId, version) -> bool

Typical agent flow:

1. Resolve modelId to latestVersion.
2. Check that the latest version is active.
3. Pull hash, uri, policyTag to decide what to load and how to treat it.

---

## 5. Access control and integration

### 5.1 Admin

- admin (or AdminGate) can:
  - Override owners in emergencies.
  - Freeze or unfreeze entries (via setModelActive).
- Normal operations:
  - owner controls their model’s versions and metadata.

We expect a real deployment to wire admin into AdminGate so the VOID master key
can indirectly govern model registry policy.

### 5.2 Policy integration

- policyTag is a bytes32 hint.
- PolicyGuard, JobQueue, AgentRegistry and other components interpret it.
- ModelRegistry itself does not enforce policy logic; it only stores the tag.

Examples:

- Jobs may require models with a certain policyTag.
- Agents may refuse to load models without a compatible policyTag.

---

## 6. Events (suggested)

Conceptual event signatures (Solidity-style):

- ModelRegistered(
    string modelId,
    uint64 version,
    address owner,
    bytes32 hash,
    string uri,
    bytes32 policyTag
  )

- ModelUpdated(
    string modelId,
    uint64 version,
    string uri,
    string metadata,
    bytes32 policyTag
  )

- ModelActivationChanged(
    string modelId,
    uint64 version,
    bool active
  )

- ModelOwnershipTransferred(
    string modelId,
    address oldOwner,
    address newOwner
  )

Indexers and agents will consume these events to build a fast off-chain view.

---

## 7. Minimal Solidity shape (sketch)

High-level structure:

- struct Version {
    bytes32 hash;
    string uri;
    bytes32 policyTag;
    string metadata;
    bool active;
  }

- struct ModelInfo {
    address owner;
    uint64 latestVersion;
    mapping(uint64 => Version) versions;
  }

- mapping(string => ModelInfo) models;
- mapping(string => bool) isRegistered;
- address admin; // or AdminGate

Core functions:

- registerModel
- updateModelMeta
- setModelActive
- transferModelOwnership
- view getters

The real implementation will add:
- Proper access control
- Input validation
- Gas optimizations
- Hooks into PolicyGuard, ModelEvalRegistry, etc.
