// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/AgentRegistry.sol";

/// @notice Minimal smoke tests for AgentRegistry.
/// @dev No forge-std, just bare require().
contract AgentRegistryTest {
    AgentRegistry private registry;

    constructor() {
        // This test contract is the MasterKey.
        registry = new AgentRegistry(address(this));
    }

    function testRegisterAgentSetsFields() public {
        string memory uri = "ipfs://agent-metadata-1";

        uint256 agentId = registry.registerAgent(uri);

        // Check reverse mapping
        require(
            registry.agentIdByAddress(address(this)) == agentId,
            "agentIdByAddress mismatch"
        );

        (
            address agentAddress,
            address owner,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getAgent(agentId);

        require(agentAddress == address(this), "agentAddress mismatch");
        require(owner == address(this), "owner mismatch");
        require(
            keccak256(bytes(metadataURI)) == keccak256(bytes(uri)),
            "metadataURI mismatch"
        );
        require(active == true, "active != true");
        require(trusted == false, "trusted != false");
        require(createdAt == updatedAt, "timestamps mismatch");
    }

    function testOwnerCanUpdateMetadataAndActive() public {
        uint256 agentId = registry.registerAgent("ipfs://agent-metadata-2");

        string memory newURI = "ipfs://agent-metadata-2b";

        registry.updateMetadata(agentId, newURI);
        registry.setActive(agentId, false);

        (
            ,
            ,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getAgent(agentId);

        require(
            keccak256(bytes(metadataURI)) == keccak256(bytes(newURI)),
            "metadataURI not updated"
        );
        require(active == false, "active not updated");

        // Sanity: these just prove the tuple shape is sane (no revert)
        trusted; createdAt; updatedAt;
    }

    function testMasterControlsTrustedAndOwnership() public {
        uint256 agentId = registry.registerAgent("ipfs://agent-metadata-3");

        // Master marks trusted and forces active off, then transfers ownership.
        registry.setTrusted(agentId, true);
        registry.forceSetActive(agentId, false);

        address newOwner = address(0xBEEF);
        registry.transferOwnership(agentId, newOwner);

        (
            ,
            address owner,
            ,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getAgent(agentId);

        require(trusted == true, "trusted not set");
        require(active == false, "active not forced false");
        require(owner == newOwner, "owner not transferred");

        // Again, touch these so the compiler doesn't whine about unused vars.
        createdAt; updatedAt;
    }
}
