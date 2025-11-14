# VOID Network – ModelRegistry Contract Spec (v1, minimal)

ModelRegistry is the on-chain registry of AI models for VOID.

- Each model is identified by a `modelKey` (`bytes32`, e.g. `keccak256("void-gpt-1")`).
- Each model has:
  - `owner` (controls updates),
  - `versionHash` (hash of weights/config/manifest),
  - `metadataURI` (off-chain JSON: arch, dataset, license, evals),
  - `active` flag,
  - `trusted` flag (MasterKey-controlled),
  - `createdAt` / `updatedAt` (block numbers).

ModelRegistry is read by:
- Agents (to know which models are allowed / recommended).
- Jobs / dApps (to tag which model is expected/required).
- Off-chain infra (to fetch manifests, evals, licenses, policies).

## 1. Responsibilities

ModelRegistry must:
- Let any address register a new model (v1 open; v2 may restrict).
- Assign a stable `modelId` per model.
- Map `modelKey -> modelId`.
- Track current version and metadata:
  - `versionHash`, `metadataURI`,
  - `active`, `trusted`,
  - `createdAt`, `updatedAt`.
- Let the **owner** update version/metadata and toggle `active`.
- Let the **MasterKey** toggle `trusted`, force `active` on/off, and transfer ownership.

ModelRegistry must NOT:
- Store full weights or large blobs.
- Execute AI on-chain.
- Enforce licensing; it only records what the owner declares.

## 2. Data model (summary)

- `uint256 public nextModelId;`
- `mapping(uint256 => Model) public models;`
- `mapping(bytes32 => uint256) public modelIdByKey;` // 0 if none

Where `Model` includes:
- `modelKey`, `owner`, `versionHash`, `metadataURI`,
- `active`, `trusted`, `createdAt`, `updatedAt`.

## 3. Core functions (high level)

- `registerModel(bytes32 modelKey, bytes32 versionHash, string metadataURI) -> modelId`
- `updateModel(uint256 modelId, bytes32 versionHash, string metadataURI)` (owner)
- `setActive(uint256 modelId, bool active)` (owner)
- `setTrusted(uint256 modelId, bool trusted)` (MasterKey)
- `forceSetActive(uint256 modelId, bool active)` (MasterKey)
- `transferOwnership(uint256 modelId, address newOwner)` (MasterKey)
- `setMasterKey(address newMasterKey)` (MasterKey)
- `getModel(uint256 modelId) -> full struct`
