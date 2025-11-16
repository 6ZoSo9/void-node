// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../contracts/AgentRegistry.sol";

contract AgentRegistryTest {
    AgentRegistry internal registry;
    address internal admin = address(0xA11CE);

    constructor() {
        registry = new AgentRegistry(admin);
    }

    // Basic admin wiring
    function testAdminIsSetOnDeploy() public {
        assert(registry.admin() == admin);
    }

    function testSetAdminOnlyAdmin() public {
        // Non-admin should revert
        (bool ok, ) = address(registry).call(
            abi.encodeWithSelector(registry.setAdmin.selector, address(0xBEEF))
        );
        require(!ok, "non-admin setAdmin should revert");

        // Admin can set
        (ok, ) = address(registry).call(
            abi.encodeWithSelector(registry.setAdmin.selector, address(0xBEEF))
        );
        require(ok, "admin setAdmin should succeed");
        assert(registry.admin() == address(0xBEEF));
    }

    function testRegisterAgentAndReadBack() public {
        string memory agentId = "void-agent/devnet-router-1";
        address runtime = address(this);
        bytes32 policyTag = keccak256("POLICY_DEVNET_V1");
        bytes32 capsHash = keccak256("CAPS_DEVNET_V1");
        string memory metadata = '{"kind":"router","env":"devnet"}';

        registry.registerAgent(agentId, runtime, policyTag, capsHash, metadata);

        require(registry.isRegistered(agentId), "should be registered");

        (
            address owner,
            address runtimeOut,
            bytes32 policyOut,
            bytes32 capsOut,
            string memory metaOut,
            bool active,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getAgent(agentId);

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

        assert(registry.getAgentOwner(agentId) == owner);
        assert(registry.getAgentRuntime(agentId) == runtimeOut);

        (bytes32 p2, bytes32 c2, string memory m2) = registry.getAgentMeta(agentId);
        assert(p2 == policyOut);
        assert(c2 == capsOut);
        require(
            keccak256(bytes(m2)) == keccak256(bytes(metaOut)),
            "meta getter mismatch"
        );
        assert(registry.isAgentActive(agentId));
    }

    function testOwnerAndAdminCanToggleActiveAndTransfer() public {
        string memory agentId = "void-agent/owner-test";
        address runtime = address(this);
        bytes32 policyTag = keccak256("POLICY");
        bytes32 capsHash = keccak256("CAPS");
        string memory metadata = "{}";

        registry.registerAgent(agentId, runtime, policyTag, capsHash, metadata);

        // Non-owner/non-admin cannot toggle
        (bool ok, ) = address(registry).call(
            abi.encodeWithSelector(
                registry.setAgentActive.selector,
                agentId,
                false
            )
        );
        require(!ok, "non-owner toggle should revert");

        // Owner toggles off
        registry.setAgentActive(agentId, false);
        assert(!registry.isAgentActive(agentId));

        // Admin toggles back on
        (ok, ) = address(registry).call(
            abi.encodeWithSelector(
                registry.setAgentActive.selector,
                agentId,
                true
            )
        );
        require(ok, "admin toggle should succeed");
        assert(registry.isAgentActive(agentId));

        // Owner transfers ownership
        address newOwner = address(0xBEEF);
        registry.transferAgentOwnership(agentId, newOwner);

        (address owner, , , , , , , ) = registry.getAgent(agentId);
        assert(owner == newOwner);
    }
}
