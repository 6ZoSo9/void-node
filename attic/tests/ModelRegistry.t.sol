// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/ModelRegistry.sol";

/// @notice Smoke tests for ModelRegistry (register/update/trust).
/// @dev MasterKey is this test contract; no forge-std.
contract ModelRegistryTest {
    ModelRegistry private registry;

    constructor() {
        registry = new ModelRegistry(address(this));
    }

    function testRegisterModelSetsFields() public {
        bytes32 modelKey = keccak256(abi.encodePacked("void-gpt-1"));
        bytes32 versionHash = keccak256(abi.encodePacked("v1"));
        string memory uri = "ipfs://example-model-metadata";

        uint256 modelId = registry.registerModel(modelKey, versionHash, uri);

        (
            bytes32 modelKeyOut,
            address ownerOut,
            bytes32 versionHashOut,
            string memory uriOut,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getModel(modelId);

        require(modelKeyOut == modelKey, "modelKey mismatch");
        require(ownerOut == address(this), "owner mismatch");
        require(versionHashOut == versionHash, "versionHash mismatch");
        require(
            keccak256(bytes(uriOut)) == keccak256(bytes(uri)),
            "metadataURI mismatch"
        );
        require(active == true, "active != true");
        require(trusted == false, "trusted != false");
        require(createdAt == updatedAt, "timestamps mismatch");
    }

    function testOwnerCanUpdateModel() public {
        bytes32 modelKey = keccak256(abi.encodePacked("void-gpt-2"));
        uint256 modelId = registry.registerModel(
            modelKey,
            keccak256(abi.encodePacked("v1")),
            "ipfs://v1"
        );

        bytes32 newHash = keccak256(abi.encodePacked("v2"));
        string memory newURI = "ipfs://v2";

        registry.updateModel(modelId, newHash, newURI);

        (
            ,
            ,
            bytes32 versionHashOut,
            string memory uriOut,
            ,
            ,
            ,
           
        ) = registry.getModel(modelId);

        require(versionHashOut == newHash, "versionHash not updated");
        require(
            keccak256(bytes(uriOut)) == keccak256(bytes(newURI)),
            "metadataURI not updated"
        );
    }

    function testMasterCanSetTrusted() public {
        bytes32 modelKey = keccak256(abi.encodePacked("void-gpt-3"));
        uint256 modelId = registry.registerModel(
            modelKey,
            keccak256(abi.encodePacked("v1")),
            "ipfs://v1"
        );

        registry.setTrusted(modelId, true);

        (
            ,
            ,
            ,
            ,
            ,
            bool trusted,
            ,
            
        ) = registry.getModel(modelId);

        require(trusted == true, "trusted not set");
    }
}
