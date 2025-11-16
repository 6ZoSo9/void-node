// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ModelRegistry v1 (minimal)
/// @notice On-chain directory of AI models for VOID agents.
/// @dev No external dependencies; admin is a simple address (can be AdminGate later).
contract ModelRegistry {
    struct Version {
        bytes32 hash;
        string uri;
        bytes32 policyTag;
        string metadata;
        bool active;
    }

    struct ModelInfo {
        address owner;
        uint64 latestVersion;
        mapping(uint64 => Version) versions;
    }

    // modelId (string) -> model info
    mapping(string => ModelInfo) private models;
    mapping(string => bool) public isRegistered;

    // Simple admin; in VOID this will usually be wired to AdminGate.
    address public admin;

    event ModelRegistered(
        string modelId,
        uint64 version,
        address owner,
        bytes32 hash,
        string uri,
        bytes32 policyTag
    );

    event ModelUpdated(
        string modelId,
        uint64 version,
        string uri,
        string metadata,
        bytes32 policyTag
    );

    event ModelActivationChanged(
        string modelId,
        uint64 version,
        bool active
    );

    event ModelOwnershipTransferred(
        string modelId,
        address oldOwner,
        address newOwner
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "ModelRegistry: not admin");
        _;
    }

    modifier onlyOwnerOrAdmin(string memory modelId) {
        ModelInfo storage info = models[modelId];
        require(
            msg.sender == info.owner || msg.sender == admin,
            "ModelRegistry: not owner/admin"
        );
        _;
    }

    constructor(address _admin) {
        admin = _admin;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "ModelRegistry: zero admin");
        admin = newAdmin;
    }

    // -------- Views (for agents) --------

    function getModelOwner(string memory modelId) external view returns (address) {
        return models[modelId].owner;
    }

    function getLatestVersion(string memory modelId) external view returns (uint64) {
        return models[modelId].latestVersion;
    }

    function getModelVersion(
        string memory modelId,
        uint64 version
    )
        external
        view
        returns (
            bytes32 hash_,
            string memory uri_,
            bytes32 policyTag_,
            string memory metadata_,
            bool active_
        )
    {
        ModelInfo storage info = models[modelId];
        Version storage v = info.versions[version];
        return (v.hash, v.uri, v.policyTag, v.metadata, v.active);
    }

    function getActiveVersion(string memory modelId) external view returns (uint64) {
        ModelInfo storage info = models[modelId];
        uint64 latest = info.latestVersion;
        if (latest == 0) return 0;
        Version storage v = info.versions[latest];
        if (v.active) {
            return latest;
        }
        // v1: simple behavior — if latest is not active, return 0.
        // Future versions could scan backwards for last active.
        return 0;
    }

    function isModelActive(
        string memory modelId,
        uint64 version
    ) external view returns (bool) {
        return models[modelId].versions[version].active;
    }

    // -------- Core functions --------

    /// @notice Register a new model or add a new version.
    /// @dev v1 rule: first registration requires admin; later versions can be added by owner or admin.
    function registerModel(
        string memory modelId,
        bytes32 hash_,
        string memory uri_,
        bytes32 policyTag_,
        string memory metadata_
    ) external {
        require(hash_ != bytes32(0), "ModelRegistry: empty hash");
        require(bytes(modelId).length != 0, "ModelRegistry: empty id");

        ModelInfo storage info = models[modelId];

        if (!isRegistered[modelId]) {
            // First registration: only admin to avoid random squatting.
            require(msg.sender == admin, "ModelRegistry: first reg admin-only");
            info.owner = msg.sender;
            info.latestVersion = 1;
            isRegistered[modelId] = true;
        } else {
            // Subsequent versions: owner or admin.
            require(
                msg.sender == info.owner || msg.sender == admin,
                "ModelRegistry: not owner/admin"
            );
            info.latestVersion += 1;
        }

        uint64 vnum = info.latestVersion;
        Version storage v = info.versions[vnum];
        v.hash = hash_;
        v.uri = uri_;
        v.policyTag = policyTag_;
        v.metadata = metadata_;
        v.active = true;

        emit ModelRegistered(modelId, vnum, info.owner, hash_, uri_, policyTag_);
    }

    /// @notice Update URI/metadata/policyTag for an existing version.
    function updateModelMeta(
        string memory modelId,
        uint64 version,
        string memory uri_,
        string memory metadata_,
        bytes32 policyTag_
    ) external onlyOwnerOrAdmin(modelId) {
        require(version != 0, "ModelRegistry: bad version");

        ModelInfo storage info = models[modelId];
        require(isRegistered[modelId], "ModelRegistry: not registered");
        require(version <= info.latestVersion, "ModelRegistry: version too high");

        Version storage v = info.versions[version];
        // Existence check: we at least enforce non-zero hash as "exists" signal.
        require(v.hash != bytes32(0), "ModelRegistry: version missing");

        v.uri = uri_;
        v.metadata = metadata_;
        v.policyTag = policyTag_;

        emit ModelUpdated(modelId, version, uri_, metadata_, policyTag_);
    }

    /// @notice Activate or deactivate a specific model version.
    function setModelActive(
        string memory modelId,
        uint64 version,
        bool active_
    ) external onlyOwnerOrAdmin(modelId) {
        require(version != 0, "ModelRegistry: bad version");
        ModelInfo storage info = models[modelId];
        require(isRegistered[modelId], "ModelRegistry: not registered");
        require(version <= info.latestVersion, "ModelRegistry: version too high");

        Version storage v = info.versions[version];
        require(v.hash != bytes32(0), "ModelRegistry: version missing");

        v.active = active_;
        emit ModelActivationChanged(modelId, version, active_);
    }

    /// @notice Transfer ownership of a model to another address.
    function transferModelOwnership(
        string memory modelId,
        address newOwner
    ) external onlyOwnerOrAdmin(modelId) {
        require(newOwner != address(0), "ModelRegistry: zero owner");
        ModelInfo storage info = models[modelId];
        require(isRegistered[modelId], "ModelRegistry: not registered");

        address oldOwner = info.owner;
        info.owner = newOwner;

        emit ModelOwnershipTransferred(modelId, oldOwner, newOwner);
    }
}
