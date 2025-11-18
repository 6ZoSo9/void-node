// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID ModelRegistry (v1, minimal)
/// @notice On-chain directory of AI models used by VOID agents and contracts.
///         This contract does NOT run models or verify outputs; it only tracks
///         metadata and active status.
contract ModelRegistry {
    struct ModelInfo {
        string modelId;
        address owner;
        uint256 chainId;
        bytes32 modelHash;
        string manifestURI;
        string version;
        bool active;
        string tag;
    }

    /// @notice Admin that can register models and override owners.
    address public admin;

    /// @dev Optional future hook for AdminGate (not used in v1).
    address public adminGate;

    /// @dev modelId => ModelInfo
    mapping(string => ModelInfo) private _models;

    /// @dev Tracks existence to distinguish unset from empty struct.
    mapping(string => bool) private _modelExists;

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

    modifier onlyAdmin() {
        require(msg.sender == admin, "ModelRegistry: not admin");
        _;
    }

    modifier onlyOwnerOrAdmin(string memory modelId) {
        require(_modelExists[modelId], "ModelRegistry: unknown model");
        ModelInfo storage info = _models[modelId];
        require(
            msg.sender == info.owner || msg.sender == admin,
            "ModelRegistry: not owner/admin"
        );
        _;
    }

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "ModelRegistry: admin=0");
        admin = initialAdmin;
        emit AdminChanged(address(0), initialAdmin);
    }

    // --- Admin configuration ---

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "ModelRegistry: admin=0");
        address prev = admin;
        admin = newAdmin;
        emit AdminChanged(prev, newAdmin);
    }

    function setAdminGate(address newAdminGate) external onlyAdmin {
        address prev = adminGate;
        adminGate = newAdminGate;
        emit AdminGateChanged(prev, newAdminGate);
    }

    // --- Model lifecycle ---

    function registerModel(
        string calldata modelId,
        address owner,
        uint256 chainId_,
        bytes32 modelHash,
        string calldata manifestURI,
        string calldata version,
        bool active,
        string calldata tag
    ) external onlyAdmin {
        require(bytes(modelId).length != 0, "ModelRegistry: empty id");
        require(!_modelExists[modelId], "ModelRegistry: already exists");
        require(owner != address(0), "ModelRegistry: owner=0");

        ModelInfo storage info = _models[modelId];
        info.modelId = modelId;
        info.owner = owner;
        info.chainId = chainId_;
        info.modelHash = modelHash;
        info.manifestURI = manifestURI;
        info.version = version;
        info.active = active;
        info.tag = tag;

        _modelExists[modelId] = true;

        emit ModelRegistered(
            modelId,
            owner,
            chainId_,
            modelHash,
            manifestURI,
            version,
            active,
            tag
        );
    }

    function updateModel(
        string calldata modelId,
        bytes32 newModelHash,
        string calldata newManifestURI,
        string calldata newVersion,
        string calldata newTag
    ) external onlyOwnerOrAdmin(modelId) {
        ModelInfo storage info = _models[modelId];
        info.modelHash = newModelHash;
        info.manifestURI = newManifestURI;
        info.version = newVersion;
        info.tag = newTag;

        emit ModelUpdated(
            modelId,
            newModelHash,
            newManifestURI,
            newVersion,
            newTag
        );
    }

    function setModelActive(
        string calldata modelId,
        bool active
    ) external onlyOwnerOrAdmin(modelId) {
        ModelInfo storage info = _models[modelId];
        info.active = active;
        emit ModelStatusChanged(modelId, active);
    }

    function transferModelOwnership(
        string calldata modelId,
        address newOwner
    ) external onlyOwnerOrAdmin(modelId) {
        require(newOwner != address(0), "ModelRegistry: newOwner=0");
        ModelInfo storage info = _models[modelId];
        address prev = info.owner;
        info.owner = newOwner;
        emit ModelOwnershipTransferred(modelId, prev, newOwner);
    }

    // --- Views / helpers ---

    function modelExists(string calldata modelId) external view returns (bool) {
        return _modelExists[modelId];
    }

    function getModel(
        string calldata modelId
    ) external view returns (ModelInfo memory) {
        require(_modelExists[modelId], "ModelRegistry: unknown model");
        return _models[modelId];
    }

    function isActive(
        string calldata modelId
    ) external view returns (bool) {
        return _modelExists[modelId] && _models[modelId].active;
    }

    function getModelHash(
        string calldata modelId
    ) external view returns (bytes32) {
        require(_modelExists[modelId], "ModelRegistry: unknown model");
        return _models[modelId].modelHash;
    }

    function getModelOwner(
        string calldata modelId
    ) external view returns (address) {
        require(_modelExists[modelId], "ModelRegistry: unknown model");
        return _models[modelId].owner;
    }
}
