// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title AgentRegistry (v1, minimal)
/// @notice Tracks which agents are allowed to submit receipts for which models.
///         Devnet/mainnet can both use this, with Admin wired to AdminGate later.
contract AgentRegistry {
    /// @notice Admin address (devnet: EOA, mainnet: AdminGate-controlled).
    address public admin;

    /// @notice If true, agent is authorized for ALL models.
    mapping(address => bool) public globalAgents;

    /// @notice Per-model authorization: agent => modelId => allowed.
    /// @dev modelId is a human-readable string (e.g. "void-devnet-model-1").
    mapping(address => mapping(string => bool)) private _agentModelAllowed;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    /// @notice Global agent toggle (all models).
    event AgentGlobalUpdated(
        address indexed agent,
        bool allowed
    );

    /// @notice Per-model agent toggle.
    event AgentModelUpdated(
        address indexed agent,
        string modelId,
        bool allowed
    );

    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address admin_) {
        require(admin_ != address(0), "AgentRegistry: admin zero");
        admin = admin_;
        emit AdminChanged(address(0), admin_);
    }

    /// @notice Change admin (devnet: EOA; mainnet: AdminGate or similar).
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "AgentRegistry: new admin zero");
        address old = admin;
        admin = newAdmin;
        emit AdminChanged(old, newAdmin);
    }

    /// @notice Set or clear an agent as globally authorized for all models.
    function setAgentGlobal(address agent, bool allowed) external onlyAdmin {
        require(agent != address(0), "AgentRegistry: agent zero");
        globalAgents[agent] = allowed;
        emit AgentGlobalUpdated(agent, allowed);
    }

    /// @notice Set or clear an agent's authorization for a specific modelId.
    function setAgentModel(
        address agent,
        string calldata modelId,
        bool allowed
    ) external onlyAdmin {
        require(agent != address(0), "AgentRegistry: agent zero");
        require(bytes(modelId).length != 0, "AgentRegistry: empty modelId");
        _agentModelAllowed[agent][modelId] = allowed;
        emit AgentModelUpdated(agent, modelId, allowed);
    }

    /// @notice Check if an agent is authorized for a given model.
    /// @dev This is the hook ReceiptRegistry expects:
    ///      - true if agent is globally allowed, OR
    ///      - true if explicitly allowed for that modelId.
    function isAuthorized(
        address agentAddr,
        string calldata modelId
    ) external view returns (bool) {
        if (globalAgents[agentAddr]) return true;
        if (bytes(modelId).length == 0) return false;
        return _agentModelAllowed[agentAddr][modelId];
    }
}
