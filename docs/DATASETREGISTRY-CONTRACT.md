# VOID Network – DatasetRegistry Contract Spec (v1, minimal)

DatasetRegistry is the on-chain directory of datasets used by VOID agents.

It does NOT store the raw data. It only tracks:
- Which datasets exist
- Who owns them
- What hash/URI describes them
- What "kind" they are (train, eval, policy, etc.)
- Whether they are currently active

Nodes and agents may treat this registry as a policy source, but it is not
a consensus rule by itself.

---

## 1. Responsibilities

DatasetRegistry must:

- Store entries keyed by a numeric datasetId (uint256).
- Emit events when datasets are registered or updated.
- Track ownership and allow owner-driven updates.
- Allow deactivating a dataset without deleting its history.
- Be governed by a master key (or AdminGate) for global controls.

DatasetRegistry cannot:

- Guarantee that an off-chain dataset actually matches the stored hash.
- Enforce licenses or usage policies by itself.
- Force nodes or agents to use only registered datasets.
- Perform any heavy on-chain checks over the data.

---

## 2. Data Model (intent)

Each dataset has a numeric id: datasetId (uint256).

For each datasetId, the registry stores a struct:

- owner: address
- hash: bytes32          // content hash or manifest root
- uri: string            // IPFS / HTTPS / VOID manifest, etc.
- kind: bytes32          // e.g. "TRAIN", "EVAL", "POLICY", "PROMPTS", etc.
- active: bool           // whether this dataset is usable in policies
- createdAt: uint64      // first registration timestamp
- updatedAt: uint64      // last update timestamp
- version: uint64        // bumps on each update

Solidity implementation: mapping(uint256 => Dataset) public datasets;
the exact struct fields live in contracts/DatasetRegistry.sol.

---

## 3. Roles and Permissions

### Master (masterKey)

- Sets/updates the master key (if supported by implementation).
- May register initial "blessed" datasets for system use.
- May perform emergency actions if implemented
  (e.g., force-deactivate a dataset under legal or safety pressure).

### Owner (per-dataset)

- Created when a dataset is first registered.
- Can update the hash, uri, kind, and active flag for that dataset.
- Can voluntarily deactivate their dataset.
- Cannot change the datasetId (id is stable once created).

---

## 4. Typical Usage in VOID

- Agents and on-chain policies reference datasetId in:
  - JobQueue job metadata
  - AgentRegistry declarations
  - ReceiptRegistry / proof-of-processing receipts

- Off-chain components fetch the uri + hash, download the manifest,
  and verify the dataset before using it.

- Nodes MAY:
  - Enforce local policies like "only allow jobs that reference datasets
    known and active in DatasetRegistry".
  - Export metrics keyed by datasetId for coverage, usage, and health.

DatasetRegistry defines the canonical mapping from datasetId to
(content hash, URI, kind, and ownership). It does not replace external
storage or legal/policy layers; it just gives VOID a shared reference
for which datasets exist and who controls them.
