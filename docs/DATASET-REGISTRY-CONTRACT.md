# VOID Network – DatasetRegistry Contract Spec (v1, minimal)

DatasetRegistry is the on-chain registry of datasets for VOID.

- Each dataset is identified by a `datasetKey` (`bytes32`, e.g. `keccak256("void-core-dataset-1")`).
- Each dataset has:
  - `owner` (controls updates),
  - `contentHash` (hash of the dataset manifest or bundle),
  - `metadataURI` (off-chain JSON: description, license, source, size, etc.),
  - `active` flag,
  - `trusted` flag (MasterKey-controlled),
  - `createdAt` / `updatedAt` (block numbers).

DatasetRegistry is read by:
- Agents (to know which datasets are allowed / recommended).
- Jobs / dApps (to tag which dataset a model/job depends on).
- Off-chain infra (to fetch manifests, licenses, provenance info).

## 1. Responsibilities

DatasetRegistry must:
- Let any address register a new dataset (v1 open; v2 may restrict).
- Assign a stable `datasetId` per dataset.
- Map `datasetKey -> datasetId`.
- Track current metadata:
  - `contentHash`, `metadataURI`,
  - `active`, `trusted`,
  - `createdAt`, `updatedAt`.
- Let the **owner**:
  - Update `contentHash` and `metadataURI`.
  - Toggle `active`.
- Let the **MasterKey**:
  - Toggle `trusted`.
  - Force `active` on/off.
  - Transfer ownership.
  - Rotate the MasterKey itself.

DatasetRegistry must NOT:
- Store full datasets or large blobs.
- Host the data itself.
- Enforce licensing; it only records what the owner declares.

## 2. Data model (summary)

- `uint256 public nextDatasetId;`
- `mapping(uint256 => Dataset) public datasets;`
- `mapping(bytes32 => uint256) public datasetIdByKey;` // 0 if none

Where `Dataset` includes:
- `datasetKey`, `owner`, `contentHash`, `metadataURI`,
- `active`, `trusted`, `createdAt`, `updatedAt`.

## 3. Core functions (high level)

- `registerDataset(bytes32 datasetKey, bytes32 contentHash, string metadataURI) -> datasetId`
- `updateDataset(uint256 datasetId, bytes32 contentHash, string metadataURI)` (owner)
- `setActive(uint256 datasetId, bool active)` (owner)
- `setTrusted(uint256 datasetId, bool trusted)` (MasterKey)
- `forceSetActive(uint256 datasetId, bool active)` (MasterKey)
- `transferOwnership(uint256 datasetId, address newOwner)` (MasterKey)
- `setMasterKey(address newMasterKey)` (MasterKey)
- `getDataset(uint256 datasetId) -> full struct`
