# VOID Network – ModelRegistry Contract Spec (v1, minimal)

ModelRegistry is the on-chain directory of AI models used by VOID agents
and contracts.

It does not run models or verify outputs. It only tracks:

- Which models exist
- Who owns them
- What hash/URI/version describes them
- Whether they are currently active
- Some minimal metadata for policy / pricing

Nodes, agents, and dapps treat ModelRegistry as a policy and discovery
source, but it is not a consensus rule by itself. Individual nodes may
refuse jobs that reference unapproved models.

---

## 1. Responsibilities

ModelRegistry must:

- Store entries keyed by a human-readable modelId (string).
- Track the current hash/URI/version for each model.
- Track owner for each model and an overall admin for the registry.
- Emit events when models are created or updated.
- Allow disabling a model without deleting its history.
- Integrate with AdminGate / MasterKey for meta-governance.

ModelRegistry cannot:

- Prove that a model is safe, unbiased, or high quality.
- Prove that a given hash corresponds to a specific weight bundle.
- Enforce off-chain usage rules by itself (that is up to agents + policy).

---

## 2. Data Model

### 2.1. Types

Model entry:

    struct ModelInfo {
        // Stable, unique identifier (e.g. "gpt-4.1-mini", "void-summarizer-v2")
        string modelId;

        // EVM address that currently "owns" the model entry.
        address owner;

        // Chain ID where the model is intended to be used (2050 for VOID).
        uint256 chainId;

        // Opaque hash describing the model (code + weights bundle).
        bytes32 modelHash;

        // URI for off-chain manifest (IPFS, HTTPS, etc.).
        string manifestURI;

        // Semantic version string, e.g. "1.0.0", "2.1.3-rc1".
        string version;

        // True if this model is currently considered active/allowed.
        bool active;

        // Optional free-form metadata (short tag).
        string tag;
    }

### 2.2. Storage

- mapping(string => ModelInfo) public models;
- mapping(string => bool) public modelExists;
- address public admin;        // controlled by AdminGate / MasterKey
- address public adminGate;    // optional: AdminGate contract address

Invariant: if modelExists[modelId] == false, the ModelInfo for that
modelId must be treated as unset.

---

## 3. Core API

### 3.1. Admin

    function setAdmin(address newAdmin) external;
    function setAdminGate(address newAdminGate) external;

Only callable by:

- current admin, or
- adminGate (which itself is governed by MasterKey / UpdateGate).

Any change must emit an AdminChanged or AdminGateChanged event.

### 3.2. Model lifecycle

    function registerModel(
        string calldata modelId,
        address owner,
        uint256 chainId,
        bytes32 modelHash,
        string calldata manifestURI,
        string calldata version,
        bool active,
        string calldata tag
    ) external;

    function updateModel(
        string calldata modelId,
        bytes32 newModelHash,
        string calldata newManifestURI,
        string calldata newVersion,
        string calldata newTag
    ) external;

    function setModelActive(
        string calldata modelId,
        bool active
    ) external;

    function transferModelOwnership(
        string calldata modelId,
        address newOwner
    ) external;

Access control:

- registerModel: admin or adminGate can register any modelId. Devnets
  may allow self-registration, but mainnet should be admin-gated.
- updateModel / setModelActive / transferModelOwnership:
  - callable by current model owner, or admin, or adminGate.

---

## 4. Events

    event ModelRegistered(
        string indexed modelId,
        address indexed owner,
        uint256 chainId,
        bytes32 modelHash,
        string manifestURI,
        string version,
        bool active,
        string tag
    );

    event ModelUpdated(
        string indexed modelId,
        bytes32 modelHash,
        string manifestURI,
        string version,
        string tag
    );

    event ModelStatusChanged(
        string indexed modelId,
        bool active
    );

    event ModelOwnershipTransferred(
        string indexed modelId,
        address indexed previousOwner,
        address indexed newOwner
    );

    event AdminChanged(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    event AdminGateChanged(
        address indexed previousAdminGate,
        address indexed newAdminGate
    );

Agents and monitoring (like our devnet metrics) will:

- Watch ModelRegistered / ModelUpdated for model metadata.
- Watch ModelStatusChanged to avoid disabled models.
- Watch AdminChanged / AdminGateChanged for governance anomalies.

---

## 5. View / helper functions

    function getModel(string calldata modelId)
        external
        view
        returns (ModelInfo memory);

    function isActive(string calldata modelId)
        external
        view
        returns (bool);

    function getModelHash(string calldata modelId)
        external
        view
        returns (bytes32);

    function getModelOwner(string calldata modelId)
        external
        view
        returns (address);

Heavy enumeration (e.g., list all models) is left to off-chain indexers.

---

## 6. Security / Governance Notes

- AdminGate integration: on VOID mainnet, admin should be an AdminGate
  contract under MasterKey control. A raw EOA is devnet/test only.
- No deletion: models should not be deleted. Deactivation must go through
  setModelActive(modelId, false) and be visible via events.
- ChainId: for VOID, chainId should be 2050, but we keep a field so the
  same code can be reused on testnets or mirrors.

---

## 7. Devnet mapping

Our current devnet instrumentation treats:

- void_models_devnet_health as a 0/1 registry health scalar.
- void_models_model_active{model="…", chain="devnet"} to represent
  active/disabled models.
- void_devnet_receipts_model_total{model="…",chain="devnet"} plus
  void:devnet:jobs_*_by_model as coverage signals that agents are
  actually using registered models.

This spec is the canonical reference for how the on-chain ModelRegistry
should behave when we port the devnet pipeline into real contracts on
VOID (chainId 2050).
