// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../contracts/AgentRegistry.sol";

/// @dev Helper that acts as a NON-admin, NON-owner caller.
/// It uses low-level calls so we can observe success/failure as a bool.
contract AgentRegistryNonAdminCaller {
    function trySetAdmin(AgentRegistry reg, address newAdmin) external returns (bool ok) {
        (ok, ) = address(reg).call(
            abi.encodeWithSelector(reg.setAdmin.selector, newAdmin)
        );
    }

    function trySetAgentActive(
        AgentRegistry reg,
        string memory agentId,
        bool active
    ) external returns (bool ok) {
        (ok, ) = address(reg).call(
            abi.encodeWithSelector(
                reg.setAgentActive.selector,
                agentId,
                active
            )
        );
    }
}

/// @dev Helper that acts as the OWNER of an agent.
/// It calls the registry directly, so msg.sender == this contract.
contract AgentRegistryOwnerCaller {
    function registerAgent(
        AgentRegistry reg,
        string memory agentId,
        address runtime,
        bytes32 policyTag,
        bytes32 capsHash,
        string memory metadata
    ) external {
        reg.registerAgent(agentId, runtime, policyTag, capsHash, metadata);
    }

    function setAgentActive(
        AgentRegistry reg,
        string memory agentId,
        bool active
    ) external {
        reg.setAgentActive(agentId, active);
    }

    function transferAgentOwnership(
        AgentRegistry reg,
        string memory agentId,
        address newOwner
    ) external {
        reg.transferAgentOwnership(agentId, newOwner);
    }
}

contract AgentRegistryTest {
    // ------------------------------------------------------------------------
    // 1. Basic admin wiring
    // ------------------------------------------------------------------------

    function testAdminIsSetOnDeploy() public {
        AgentRegistry reg = new AgentRegistry(address(this));
        assert(reg.admin() == address(this));
    }

    function testSetAdminOnlyAdmin() public {
        // Fresh registry where THIS contract is admin
        AgentRegistry reg = new AgentRegistry(address(this));

        // Non-admin caller
        AgentRegistryNonAdminCaller nonAdmin = new AgentRegistryNonAdminCaller();

        // 1) Non-admin should revert (low-level call returns ok = false)
        bool ok = nonAdmin.trySetAdmin(reg, address(0xBEEF));
        require(!ok, "non-admin setAdmin should revert");

        // 2) Admin (this contract) can set directly
        reg.setAdmin(address(0xBEEF));
        assert(reg.admin() == address(0xBEEF));
    }

    // ------------------------------------------------------------------------
    // 2. Register + view paths
    // ------------------------------------------------------------------------

    function testRegisterAgentAndReadBack() public {
        AgentRegistry reg = new AgentRegistry(address(this));

        string memory agentId = "void-agent/devnet-router-1";
        address runtime = address(this);
        bytes32 policyTag = keccak256("POLICY_DEVNET_V1");
        bytes32 capsHash = keccak256("CAPS_DEVNET_V1");
        string memory metadata = '{"kind":"router","env":"devnet"}';

        reg.registerAgent(agentId, runtime, policyTag, capsHash, metadata);

        require(reg.isRegistered(agentId), "should be registered");

        (
            address owner,
            address runtimeOut,
            bytes32 policyOut,
            bytes32 capsOut,
            string memory metaOut,
            bool active,
            uint64 createdAt,
            uint64 updatedAt
        ) = reg.getAgent(agentId);

        assert(owner == address(this));
        assert(runtimeOut == runtime);
        assert(policyOut == policyTag);
        assert(capsOut == capsHash);
        require(
            keccak256(bytes(metaOut)) == keccak256(bytes(metadata)),
            "metadata mismatch"
        );
        assert(active);
        assert(createdAt > 0);
        assert(updatedAt >= createdAt);

        assert(reg.getAgentOwner(agentId) == owner);
        assert(reg.getAgentRuntime(agentId) == runtimeOut);

        (bytes32 p2, bytes32 c2, string memory m2) = reg.getAgentMeta(agentId);
        assert(p2 == policyOut);
        assert(c2 == capsOut);
        require(
            keccak256(bytes(m2)) == keccak256(bytes(metaOut)),
            "meta getter mismatch"
        );
        assert(reg.isAgentActive(agentId));
    }

    // ------------------------------------------------------------------------
    // 3. Owner vs admin behaviour
    // ------------------------------------------------------------------------

    function testOwnerAndAdminCanToggleActiveAndTransfer() public {
        // Fresh registry; THIS contract is admin
        AgentRegistry reg = new AgentRegistry(address(this));

        // Owner is a separate contract
        AgentRegistryOwnerCaller ownerCaller = new AgentRegistryOwnerCaller();
        // Non-admin/non-owner caller
        AgentRegistryNonAdminCaller nonAdmin = new AgentRegistryNonAdminCaller();

        string memory agentId = "void-agent/owner-test";
        address runtime = address(ownerCaller);
        bytes32 policyTag = keccak256("POLICY");
        bytes32 capsHash = keccak256("CAPS");
        string memory metadata = "{}";

        // Register via ownerCaller so owner == address(ownerCaller)
        ownerCaller.registerAgent(
            reg,
            agentId,
            runtime,
            policyTag,
            capsHash,
            metadata
        );

        // Non-owner/non-admin cannot toggle (low-level call → ok == false)
        bool ok = nonAdmin.trySetAgentActive(reg, agentId, false);
        require(!ok, "non-owner toggle should revert");

        // Owner toggles off
        ownerCaller.setAgentActive(reg, agentId, false);
        assert(!reg.isAgentActive(agentId));

        // Admin (this contract) toggles back on
        reg.setAgentActive(agentId, true);
        assert(reg.isAgentActive(agentId));

        // Owner transfers ownership
        address newOwner = address(0xBEEF);
        ownerCaller.transferAgentOwnership(reg, agentId, newOwner);

        (address owner, , , , , , , ) = reg.getAgent(agentId);
        assert(owner == newOwner);
    }
}
