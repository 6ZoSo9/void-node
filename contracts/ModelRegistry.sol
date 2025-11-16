// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ModelRegistry (v1, minimal)
/// @notice On-chain directory of AI models for VOID Network.
contract ModelRegistry {
    struct Model {
        address owner;
        bytes32 hash;
        string uri;
        bool active;
    }

    event ModelRegistered(string modelId, address owner, bytes32 hash, string uri);
    event ModelUpdated(string modelId, bytes32 hash, string uri);
    event ModelStatusChanged(string modelId, bool active);
    event ModelOwnershipTransferred(string modelId, address previousOwner, address newOwner);

    address public immutable admin;
    mapping(string => Model) private models;

    error NotAdmin();
    error NotOwner();
    error ModelAlreadyExists();
    error ModelDoesNotExist();
    error ZeroOwner();

    constructor(address _admin) {
        require(_admin != address(0), "admin=0");
        admin = _admin;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyOwner(string memory modelId) {
        Model storage m = models[modelId];
        if (m.owner == address(0)) revert ModelDoesNotExist();
        if (m.owner != msg.sender) revert NotOwner();
        _;
    }

    function getModel(string calldata modelId) external view returns (Model memory) {
        Model memory m = models[modelId];
        if (m.owner == address(0)) revert ModelDoesNotExist();
        return m;
    }

    function isActive(string calldata modelId) external view returns (bool) {
        Model memory m = models[modelId];
        if (m.owner == address(0)) return false;
        return m.active;
    }

    /// @notice Register a new model. Only admin can call. Fails if modelId exists.
    function registerModel(
        string calldata modelId,
        address owner_,
        bytes32 hash_,
        string calldata uri_
    ) external onlyAdmin {
        if (owner_ == address(0)) revert ZeroOwner();
        Model storage existing = models[modelId];
        if (existing.owner != address(0)) revert ModelAlreadyExists();

        models[modelId] = Model({
            owner: owner_,
            hash: hash_,
            uri: uri_,
            active: true
        });

        emit ModelRegistered(modelId, owner_, hash_, uri_);
    }

    /// @notice Update hash/uri. Only current owner can call.
    function setModel(
        string calldata modelId,
        bytes32 hash_,
        string calldata uri_
    ) external onlyOwner(modelId) {
        Model storage m = models[modelId];
        m.hash = hash_;
        m.uri = uri_;
        emit ModelUpdated(modelId, hash_, uri_);
    }

    /// @notice Enable/disable model. Only admin can call.
    function setActive(string calldata modelId, bool active_) external onlyAdmin {
        Model storage m = models[modelId];
        if (m.owner == address(0)) revert ModelDoesNotExist();
        m.active = active_;
        emit ModelStatusChanged(modelId, active_);
    }

    /// @notice Transfer model ownership. Only current owner can call.
    function transferModelOwnership(
        string calldata modelId,
        address newOwner
    ) external onlyOwner(modelId) {
        if (newOwner == address(0)) revert ZeroOwner();
        Model storage m = models[modelId];
        address prev = m.owner;
        m.owner = newOwner;
        emit ModelOwnershipTransferred(modelId, prev, newOwner);
    }
}
