// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID ModelRegistry v1
/// @notice On-chain registry of AI models for VOID agents and jobs.
/// @dev V1 is deliberately simple: one "current" version per model, trusted flag, MasterKey controls.
contract ModelRegistry {
    /// @notice Master key that can mark models trusted and perform emergency actions.
    address public masterKey;

    struct Model {
        bytes32 modelKey;
        address owner;
        bytes32 versionHash;
        string metadataURI;
        bool active;
        bool trusted;
        uint64 createdAt;
        uint64 updatedAt;
    }

    /// @notice Monotonically increasing model id (1-based).
    uint256 public nextModelId;

    /// @notice Registry of models by id.
    mapping(uint256 => Model) public models;

    /// @notice Stable key -> modelId mapping (0 if not registered).
    mapping(bytes32 => uint256) public modelIdByKey;

    event MasterKeyChanged(
        address indexed oldKey,
        address indexed newKey
    );

    event ModelRegistered(
        uint256 indexed modelId,
        bytes32 indexed modelKey,
        address indexed owner,
        bytes32 versionHash,
        string metadataURI
    );

    event ModelUpdated(
        uint256 indexed modelId,
        bytes32 versionHash,
        string metadataURI
    );

    event ModelStatusChanged(
        uint256 indexed modelId,
        bool active
    );

    event ModelTrustedChanged(
        uint256 indexed modelId,
        bool trusted
    );

    event ModelOwnerChanged(
        uint256 indexed modelId,
        address indexed oldOwner,
        address indexed newOwner
    );

    modifier onlyMaster() {
        require(msg.sender == masterKey, "ModelRegistry: not master");
        _;
    }

    modifier onlyOwner(uint256 modelId) {
        address owner = models[modelId].owner;
        require(owner != address(0), "ModelRegistry: unknown model");
        require(msg.sender == owner, "ModelRegistry: not owner");
        _;
    }

    /// @notice Contract version (not model version).
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @param masterKey_ Initial MasterKey address.
    constructor(address masterKey_) {
        require(masterKey_ != address(0), "ModelRegistry: masterKey zero");
        masterKey = masterKey_;
        emit MasterKeyChanged(address(0), masterKey_);
    }

    /// @notice Register a new model.
    /// @param modelKey Stable model key (e.g. keccak256("void-gpt-1")).
    /// @param versionHash Hash of the model's weights/config/manifest.
    /// @param metadataURI Off-chain JSON describing the model.
    /// @return modelId Newly assigned model id.
    function registerModel(
        bytes32 modelKey,
        bytes32 versionHash,
        string calldata metadataURI
    ) external returns (uint256 modelId) {
        require(modelKey != bytes32(0), "ModelRegistry: modelKey zero");
        require(
            modelIdByKey[modelKey] == 0,
            "ModelRegistry: key already registered"
        );

        modelId = ++nextModelId;

        Model storage m = models[modelId];
        m.modelKey = modelKey;
        m.owner = msg.sender;
        m.versionHash = versionHash;
        m.metadataURI = metadataURI;
        m.active = true;
        m.trusted = false;
        m.createdAt = uint64(block.number);
        m.updatedAt = uint64(block.number);

        modelIdByKey[modelKey] = modelId;

        emit ModelRegistered(
            modelId,
            modelKey,
            msg.sender,
            versionHash,
            metadataURI
        );
        emit ModelStatusChanged(modelId, true);
    }

    /// @notice Update the current version and metadata for a model (owner only).
    function updateModel(
        uint256 modelId,
        bytes32 versionHash,
        string calldata metadataURI
    ) external onlyOwner(modelId) {
        Model storage m = models[modelId];
        m.versionHash = versionHash;
        m.metadataURI = metadataURI;
        m.updatedAt = uint64(block.number);

        emit ModelUpdated(modelId, versionHash, metadataURI);
    }

    /// @notice Set the active flag (owner only).
    function setActive(uint256 modelId, bool active)
        external
        onlyOwner(modelId)
    {
        Model storage m = models[modelId];
        m.active = active;
        m.updatedAt = uint64(block.number);

        emit ModelStatusChanged(modelId, active);
    }

    /// @notice Mark/unmark a model as trusted (MasterKey only).
    function setTrusted(uint256 modelId, bool trusted)
        external
        onlyMaster
    {
        Model storage m = models[modelId];
        require(m.owner != address(0), "ModelRegistry: unknown model");

        m.trusted = trusted;
        m.updatedAt = uint64(block.number);

        emit ModelTrustedChanged(modelId, trusted);
    }

    /// @notice Forcefully set active flag (MasterKey only).
    function forceSetActive(uint256 modelId, bool active)
        external
        onlyMaster
    {
        Model storage m = models[modelId];
        require(m.owner != address(0), "ModelRegistry: unknown model");

        m.active = active;
        m.updatedAt = uint64(block.number);

        emit ModelStatusChanged(modelId, active);
    }

    /// @notice Transfer model ownership (MasterKey only; for key rotation, etc.).
    function transferOwnership(uint256 modelId, address newOwner)
        external
        onlyMaster
    {
        require(newOwner != address(0), "ModelRegistry: newOwner zero");
        Model storage m = models[modelId];
        address oldOwner = m.owner;
        require(oldOwner != address(0), "ModelRegistry: unknown model");

        m.owner = newOwner;
        m.updatedAt = uint64(block.number);

        emit ModelOwnerChanged(modelId, oldOwner, newOwner);
    }

    /// @notice Change MasterKey.
    function setMasterKey(address newMasterKey) external onlyMaster {
        require(newMasterKey != address(0), "ModelRegistry: masterKey zero");
        address old = masterKey;
        masterKey = newMasterKey;
        emit MasterKeyChanged(old, newMasterKey);
    }

    /// @notice Convenience view that returns the full model struct.
    function getModel(uint256 modelId)
        external
        view
        returns (
            bytes32 modelKey,
            address owner,
            bytes32 versionHash,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        )
    {
        Model storage m = models[modelId];
        require(m.owner != address(0), "ModelRegistry: unknown model");

        return (
            m.modelKey,
            m.owner,
            m.versionHash,
            m.metadataURI,
            m.active,
            m.trusted,
            m.createdAt,
            m.updatedAt
        );
    }
}
