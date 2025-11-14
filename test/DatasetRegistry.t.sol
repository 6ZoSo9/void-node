// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/DatasetRegistry.sol";

/// @notice Minimal smoke tests for DatasetRegistry.
/// @dev No forge-std, just bare require().
contract DatasetRegistryTest {
    DatasetRegistry private registry;

    constructor() {
        // This test contract is the MasterKey.
        registry = new DatasetRegistry(address(this));
    }

    function testRegisterDatasetSetsFields() public {
        bytes32 key = keccak256("void-dataset-1");
        bytes32 ver = keccak256("v1");
        string memory uri = "ipfs://dataset-metadata-1";

        uint256 datasetId = registry.registerDataset(key, ver, uri);

        // Check some basic mapping invariants via getDataset
        (
            bytes32 datasetKey,
            address owner,
            bytes32 versionHash,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getDataset(datasetId);

        require(datasetKey == key, "datasetKey mismatch");
        require(owner == address(this), "owner mismatch");
        require(versionHash == ver, "versionHash mismatch");
        require(
            keccak256(bytes(metadataURI)) == keccak256(bytes(uri)),
            "metadataURI mismatch"
        );
        require(active == true, "active != true");
        require(trusted == false, "trusted != false");
        require(createdAt == updatedAt, "timestamps mismatch");
    }

    function testOwnerCanUpdateDatasetAndActive() public {
        bytes32 key = keccak256("void-dataset-2");
        bytes32 ver1 = keccak256("v1");
        bytes32 ver2 = keccak256("v2");
        uint256 datasetId = registry.registerDataset(
            key,
            ver1,
            "ipfs://dataset-metadata-2"
        );

        string memory newURI = "ipfs://dataset-metadata-2b";

        registry.updateDataset(datasetId, ver2, newURI);
        registry.setActive(datasetId, false);

        (
            bytes32 datasetKey,
            address owner,
            bytes32 versionHash,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getDataset(datasetId);

        require(datasetKey == key, "datasetKey changed unexpectedly");
        require(owner == address(this), "owner changed unexpectedly");
        require(versionHash == ver2, "versionHash not updated");
        require(
            keccak256(bytes(metadataURI)) == keccak256(bytes(newURI)),
            "metadataURI not updated"
        );
        require(active == false, "active not updated");
        // Touch to avoid "unused" noise.
        trusted; createdAt; updatedAt;
    }

    function testMasterControlsTrustedAndOwnership() public {
        bytes32 key = keccak256("void-dataset-3");
        bytes32 ver = keccak256("v1");
        uint256 datasetId = registry.registerDataset(
            key,
            ver,
            "ipfs://dataset-metadata-3"
        );

        // Master marks trusted and forces active off, then transfers ownership.
        registry.setTrusted(datasetId, true);
        registry.forceSetActive(datasetId, false);

        address newOwner = address(0xBEEF);
        registry.transferOwnership(datasetId, newOwner);

        (
            bytes32 datasetKey,
            address owner,
            bytes32 versionHash,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        ) = registry.getDataset(datasetId);

        require(datasetKey == key, "datasetKey mismatch after master ops");
        require(versionHash == ver, "versionHash changed unexpectedly");
        require(owner == newOwner, "owner not transferred");
        require(active == false, "active not forced false");
        require(trusted == true, "trusted not set true");
        // Again, just to keep compiler happy.
        metadataURI; createdAt; updatedAt;
    }
}
