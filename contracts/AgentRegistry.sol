// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title AgentRegistry (v1, minimal)
/// @notice On-chain directory of agents that can handle jobs & report receipts.
/// - Stores owner/runtime/policy metadata.
/// - Does NOT run jobs or enforce economics in v1.
contract AgentRegistry {
    struct Agent {
        address owner;           // control key / admin
        address runtime;         // address used when talking to JobReceipts
        bytes32 policyTag;       // opaque tag for PolicyGuard
        bytes32 capabilitiesHash;// hash of JSON capabilities doc
        string metadata;         // free-form JSON (small)
        bool active;             // is this agent allowed to act
        uint64 createdAt;        // first registration time
        uint64 updatedAt;        // last update time
    }

    /// @notice Global admin (expected to be AdminGate / MasterKey governed in real deployments)
    address public admin;

    /// @dev Agent data keyed by human-readable agentId string.
    mapping(string => Agent) private agents;

    /// @notice Whether an agentId has been registered at least once.
    mapping(string => bool) public isRegistered;

    // ------------------------------------------------------------------------
    // Events (match the spec)
    // ------------------------------------------------------------------------

    event AgentRegistered(
        string agentId,
        address owner,
        address runtime,
        bytes32 policyTag,
        bytes32 capabilitiesHash,
        string metadata
    );

    event AgentActivationChanged(
        string agentId,
        bool active
    );

    event AgentRuntimeUpdated(
        string agentId,
        address oldRuntime,
        address newRuntime
    );

    event AgentMetaUpdated(
        string agentId,
        bytes32 oldPolicyTag,
        bytes32 newPolicyTag,
        bytes32 oldCapabilitiesHash,
        bytes32 newCapabilitiesHash,
        string oldMetadata,
        string newMetadata
    );

    event AgentOwnershipTransferred(
        string agentId,
        address oldOwner,
        address newOwner
    );

    event AdminChanged(
        address oldAdmin,
        address newAdmin
    );

    // ------------------------------------------------------------------------
    // Modifiers / internal helpers
    // ------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "AgentRegistry: not admin");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "AgentRegistry: admin zero");
        admin = _admin;
        emit AdminChanged(address(0), _admin);
    }

    /// @notice Change the admin (AdminGate / MasterKey controller).
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "AgentRegistry: admin zero");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @dev Returns storage ref and enforces that caller is owner or admin.
    function _requireOwnerOrAdmin(
        string memory agentId
    ) internal view returns (Agent storage a) {
        require(isRegistered[agentId], "AgentRegistry: not registered");
        a = agents[agentId];
        require(
            msg.sender == a.owner || msg.sender == admin,
            "AgentRegistry: not owner/admin"
        );
    }

    // ------------------------------------------------------------------------
    // Core functions
    // ------------------------------------------------------------------------

    /// @notice Register a new agent. Fails if the agentId already exists.
    /// @param agentId Human-readable ID (e.g. "void-agent/devnet-router-1").
    /// @param runtime Runtime address that will interact with JobReceipts.
    /// @param policyTag Opaque policy tag, interpreted by PolicyGuard.
    /// @param capabilitiesHash Hash of JSON capabilities document.
    /// @param metadata Free-form metadata (JSON, small).
    function registerAgent(
        string calldata agentId,
        address runtime,
        bytes32 policyTag,
        bytes32 capabilitiesHash,
        string calldata metadata
    ) external {
        require(!isRegistered[agentId], "AgentRegistry: already registered");
        require(runtime != address(0), "AgentRegistry: runtime zero");

        Agent storage a = agents[agentId];
        a.owner = msg.sender;
        a.runtime = runtime;
        a.policyTag = policyTag;
        a.capabilitiesHash = capabilitiesHash;
        a.metadata = metadata;
        a.active = true;

        uint64 ts = uint64(block.timestamp);
        a.createdAt = ts;
        a.updatedAt = ts;

        isRegistered[agentId] = true;

        emit AgentRegistered(
            agentId,
            a.owner,
            a.runtime,
            a.policyTag,
            a.capabilitiesHash,
            a.metadata
        );
        emit AgentActivationChanged(agentId, true);
    }

    /// @notice Enable/disable an existing agent.
    /// @param agentId Agent identifier.
    /// @param active New active flag.
    function setAgentActive(
        string calldata agentId,
        bool active
    ) external {
        Agent storage a = _requireOwnerOrAdmin(agentId);
        if (a.active == active) {
            // no-op
            return;
        }
        a.active = active;
        a.updatedAt = uint64(block.timestamp);
        emit AgentActivationChanged(agentId, active);
    }

    /// @notice Update runtime address for an agent.
    /// @param agentId Agent identifier.
    /// @param newRuntime New runtime address.
    function updateAgentRuntime(
        string calldata agentId,
        address newRuntime
    ) external {
        require(newRuntime != address(0), "AgentRegistry: runtime zero");
        Agent storage a = _requireOwnerOrAdmin(agentId);

        address old = a.runtime;
        if (old == newRuntime) {
            return;
        }

        a.runtime = newRuntime;
        a.updatedAt = uint64(block.timestamp);

        emit AgentRuntimeUpdated(agentId, old, newRuntime);
    }

    /// @notice Update policy/capabilities/metadata for an agent.
    /// @param agentId Agent identifier.
    /// @param policyTag New policy tag.
    /// @param capabilitiesHash New capabilities hash.
    /// @param metadata New metadata JSON.
    function updateAgentMeta(
        string calldata agentId,
        bytes32 policyTag,
        bytes32 capabilitiesHash,
        string calldata metadata
    ) external {
        Agent storage a = _requireOwnerOrAdmin(agentId);

        bytes32 oldPolicy = a.policyTag;
        bytes32 oldCaps = a.capabilitiesHash;
        string memory oldMeta = a.metadata;

        a.policyTag = policyTag;
        a.capabilitiesHash = capabilitiesHash;
        a.metadata = metadata;
        a.updatedAt = uint64(block.timestamp);

        emit AgentMetaUpdated(
            agentId,
            oldPolicy,
            policyTag,
            oldCaps,
            capabilitiesHash,
            oldMeta,
            metadata
        );
    }

    /// @notice Transfer control/ownership of an agent to a new owner.
    /// @param agentId Agent identifier.
    /// @param newOwner New owner address.
    function transferAgentOwnership(
        string calldata agentId,
        address newOwner
    ) external {
        require(newOwner != address(0), "AgentRegistry: owner zero");
        Agent storage a = _requireOwnerOrAdmin(agentId);

        address oldOwner = a.owner;
        if (oldOwner == newOwner) {
            return;
        }

        a.owner = newOwner;
        a.updatedAt = uint64(block.timestamp);

        emit AgentOwnershipTransferred(agentId, oldOwner, newOwner);
    }

    // ------------------------------------------------------------------------
    // Views (for JobReceipts & agents)
    // ------------------------------------------------------------------------

    function getAgentOwner(
        string calldata agentId
    ) external view returns (address) {
        require(isRegistered[agentId], "AgentRegistry: not registered");
        return agents[agentId].owner;
    }

    function getAgentRuntime(
        string calldata agentId
    ) external view returns (address) {
        require(isRegistered[agentId], "AgentRegistry: not registered");
        return agents[agentId].runtime;
    }

    function getAgentMeta(
        string calldata agentId
    )
        external
        view
        returns (
            bytes32 policyTag,
            bytes32 capabilitiesHash,
            string memory metadata
        )
    {
        require(isRegistered[agentId], "AgentRegistry: not registered");
        Agent storage a = agents[agentId];
        return (a.policyTag, a.capabilitiesHash, a.metadata);
    }

    function isAgentActive(
        string calldata agentId
    ) external view returns (bool) {
        if (!isRegistered[agentId]) {
            return false;
        }
        return agents[agentId].active;
    }

    /// @notice Full dump of an agent record (for off-chain infra).
    function getAgent(
        string calldata agentId
    )
        external
        view
        returns (
            address owner,
            address runtime,
            bytes32 policyTag,
            bytes32 capabilitiesHash,
            string memory metadata,
            bool active,
            uint64 createdAt,
            uint64 updatedAt
        )
    {
        require(isRegistered[agentId], "AgentRegistry: not registered");
        Agent storage a = agents[agentId];
        return (
            a.owner,
            a.runtime,
            a.policyTag,
            a.capabilitiesHash,
            a.metadata,
            a.active,
            a.createdAt,
            a.updatedAt
        );
    }
}
