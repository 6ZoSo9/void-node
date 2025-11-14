// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID AgentRegistry v1
/// @notice Minimal registry of off-chain agents that work with JobQueue / VOID infra.
/// @dev V1 is intentionally simple: no staking, no reputation, no capability tags.
contract AgentRegistry {
    /// @notice Master key that can mark agents trusted and perform emergency actions.
    address public masterKey;

    struct Agent {
        address agentAddress;
        address owner;
        string metadataURI;
        bool active;
        bool trusted;
        uint64 createdAt;
        uint64 updatedAt;
    }

    /// @notice Monotonically increasing agent id (1-based).
    uint256 public nextAgentId;

    /// @notice Registry of agents by id.
    mapping(uint256 => Agent) public agents;

    /// @notice Optional reverse lookup: agent address -> agentId (0 if none).
    mapping(address => uint256) public agentIdByAddress;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed agentAddress,
        address indexed owner,
        string metadataURI
    );

    event AgentUpdated(
        uint256 indexed agentId,
        string metadataURI
    );

    event AgentStatusChanged(
        uint256 indexed agentId,
        bool active
    );

    event AgentTrustedChanged(
        uint256 indexed agentId,
        bool trusted
    );

    event AgentOwnerChanged(
        uint256 indexed agentId,
        address indexed oldOwner,
        address indexed newOwner
    );

    event MasterKeyChanged(
        address indexed oldKey,
        address indexed newKey
    );

    modifier onlyMaster() {
        require(msg.sender == masterKey, "AgentRegistry: not master");
        _;
    }

    modifier onlyOwner(uint256 agentId) {
        address owner = agents[agentId].owner;
        require(owner != address(0), "AgentRegistry: unknown agent");
        require(msg.sender == owner, "AgentRegistry: not owner");
        _;
    }

    /// @notice Contract version for off-chain infra (not agent version).
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @param masterKey_ Initial MasterKey address.
    constructor(address masterKey_) {
        require(masterKey_ != address(0), "AgentRegistry: masterKey zero");
        masterKey = masterKey_;
        emit MasterKeyChanged(address(0), masterKey_);
    }

    /// @notice Register the caller as a new agent.
    /// @param metadataURI Off-chain URI describing models/capabilities/endpoints.
    /// @return agentId Newly assigned agent id.
    function registerAgent(string calldata metadataURI)
        external
        returns (uint256 agentId)
    {
        require(
            agentIdByAddress[msg.sender] == 0,
            "AgentRegistry: already registered"
        );

        agentId = ++nextAgentId;

        Agent storage a = agents[agentId];
        a.agentAddress = msg.sender;
        a.owner = msg.sender;
        a.metadataURI = metadataURI;
        a.active = true;
        a.trusted = false;
        a.createdAt = uint64(block.number);
        a.updatedAt = uint64(block.number);

        agentIdByAddress[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, msg.sender, metadataURI);
        emit AgentStatusChanged(agentId, true);
    }

    /// @notice Update metadata URI for an existing agent (owner only).
    function updateMetadata(uint256 agentId, string calldata metadataURI)
        external
        onlyOwner(agentId)
    {
        Agent storage a = agents[agentId];
        a.metadataURI = metadataURI;
        a.updatedAt = uint64(block.number);

        emit AgentUpdated(agentId, metadataURI);
    }

    /// @notice Set the active flag for an agent (owner only).
    function setActive(uint256 agentId, bool active)
        external
        onlyOwner(agentId)
    {
        Agent storage a = agents[agentId];
        a.active = active;
        a.updatedAt = uint64(block.number);

        emit AgentStatusChanged(agentId, active);
    }

    /// @notice Mark/unmark an agent as trusted (MasterKey only).
    function setTrusted(uint256 agentId, bool trusted)
        external
        onlyMaster
    {
        Agent storage a = agents[agentId];
        require(a.owner != address(0), "AgentRegistry: unknown agent");

        a.trusted = trusted;
        a.updatedAt = uint64(block.number);

        emit AgentTrustedChanged(agentId, trusted);
    }

    /// @notice Forcefully set active flag (MasterKey only, emergency/offboarding).
    function forceSetActive(uint256 agentId, bool active)
        external
        onlyMaster
    {
        Agent storage a = agents[agentId];
        require(a.owner != address(0), "AgentRegistry: unknown agent");

        a.active = active;
        a.updatedAt = uint64(block.number);

        emit AgentStatusChanged(agentId, active);
    }

    /// @notice Transfer ownership of an agent (MasterKey only).
    /// @dev Useful for key rotations or centralized agents.
    function transferOwnership(uint256 agentId, address newOwner)
        external
        onlyMaster
    {
        require(newOwner != address(0), "AgentRegistry: newOwner zero");
        Agent storage a = agents[agentId];
        address oldOwner = a.owner;
        require(oldOwner != address(0), "AgentRegistry: unknown agent");

        a.owner = newOwner;
        a.updatedAt = uint64(block.number);

        emit AgentOwnerChanged(agentId, oldOwner, newOwner);
    }

    /// @notice Change MasterKey.
    function setMasterKey(address newMasterKey) external onlyMaster {
        require(newMasterKey != address(0), "AgentRegistry: masterKey zero");
        address old = masterKey;
        masterKey = newMasterKey;
        emit MasterKeyChanged(old, newMasterKey);
    }

    /// @notice Convenience view that returns the full agent struct.
    function getAgent(uint256 agentId)
        external
        view
        returns (
            address agentAddress,
            address owner,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        )
    {
        Agent storage a = agents[agentId];
        require(a.owner != address(0), "AgentRegistry: unknown agent");

        return (
            a.agentAddress,
            a.owner,
            a.metadataURI,
            a.active,
            a.trusted,
            a.createdAt,
            a.updatedAt
        );
    }
}
