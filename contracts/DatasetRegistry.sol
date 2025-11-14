// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID DatasetRegistry v1
/// @notice On-chain registry of datasets for VOID models and jobs.
/// @dev V1 is deliberately simple: one "current" record per dataset, trusted flag, MasterKey controls.
contract DatasetRegistry {
    /// @notice Master key that can mark datasets trusted and perform emergency actions.
    address public masterKey;

    struct Dataset {
        bytes32 datasetKey;
        address owner;
        bytes32 contentHash;
        string metadataURI;
        bool active;
        bool trusted;
        uint64 createdAt;
        uint64 updatedAt;
    }

    /// @notice Monotonically increasing dataset id (1-based).
    uint256 public nextDatasetId;

    /// @notice Registry of datasets by id.
    mapping(uint256 => Dataset) public datasets;

    /// @notice Stable key -> datasetId mapping (0 if not registered).
    mapping(bytes32 => uint256) public datasetIdByKey;

    event MasterKeyChanged(
        address indexed oldKey,
        address indexed newKey
    );

    event DatasetRegistered(
        uint256 indexed datasetId,
        bytes32 indexed datasetKey,
        address indexed owner,
        bytes32 contentHash,
        string metadataURI
    );

    event DatasetUpdated(
        uint256 indexed datasetId,
        bytes32 contentHash,
        string metadataURI
    );

    event DatasetStatusChanged(
        uint256 indexed datasetId,
        bool active
    );

    event DatasetTrustedChanged(
        uint256 indexed datasetId,
        bool trusted
    );

    event DatasetOwnerChanged(
        uint256 indexed datasetId,
        address indexed oldOwner,
        address indexed newOwner
    );

    modifier onlyMaster() {
        require(msg.sender == masterKey, "DatasetRegistry: not master");
        _;
    }

    modifier onlyOwner(uint256 datasetId) {
        address owner = datasets[datasetId].owner;
        require(owner != address(0), "DatasetRegistry: unknown dataset");
        require(msg.sender == owner, "DatasetRegistry: not owner");
        _;
    }

    /// @notice Contract version (not dataset version).
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @param masterKey_ Initial MasterKey address.
    constructor(address masterKey_) {
        require(masterKey_ != address(0), "DatasetRegistry: masterKey zero");
        masterKey = masterKey_;
        emit MasterKeyChanged(address(0), masterKey_);
    }

    /// @notice Register a new dataset.
    /// @param datasetKey Stable dataset key (e.g. keccak256("void-core-dataset-1")).
    /// @param contentHash Hash of the dataset manifest or bundle.
    /// @param metadataURI Off-chain JSON describing the dataset.
    /// @return datasetId Newly assigned dataset id.
    function registerDataset(
        bytes32 datasetKey,
        bytes32 contentHash,
        string calldata metadataURI
    ) external returns (uint256 datasetId) {
        require(datasetKey != bytes32(0), "DatasetRegistry: datasetKey zero");
        require(
            datasetIdByKey[datasetKey] == 0,
            "DatasetRegistry: key already registered"
        );

        datasetId = ++nextDatasetId;

        Dataset storage d = datasets[datasetId];
        d.datasetKey = datasetKey;
        d.owner = msg.sender;
        d.contentHash = contentHash;
        d.metadataURI = metadataURI;
        d.active = true;
        d.trusted = false;
        d.createdAt = uint64(block.number);
        d.updatedAt = uint64(block.number);

        datasetIdByKey[datasetKey] = datasetId;

        emit DatasetRegistered(
            datasetId,
            datasetKey,
            msg.sender,
            contentHash,
            metadataURI
        );
        emit DatasetStatusChanged(datasetId, true);
    }

    /// @notice Update the current content hash and metadata for a dataset (owner only).
    function updateDataset(
        uint256 datasetId,
        bytes32 contentHash,
        string calldata metadataURI
    ) external onlyOwner(datasetId) {
        Dataset storage d = datasets[datasetId];
        d.contentHash = contentHash;
        d.metadataURI = metadataURI;
        d.updatedAt = uint64(block.number);

        emit DatasetUpdated(datasetId, contentHash, metadataURI);
    }

    /// @notice Set the active flag (owner only).
    function setActive(uint256 datasetId, bool active)
        external
        onlyOwner(datasetId)
    {
        Dataset storage d = datasets[datasetId];
        d.active = active;
        d.updatedAt = uint64(block.number);

        emit DatasetStatusChanged(datasetId, active);
    }

    /// @notice Mark/unmark a dataset as trusted (MasterKey only).
    function setTrusted(uint256 datasetId, bool trusted)
        external
        onlyMaster
    {
        Dataset storage d = datasets[datasetId];
        require(d.owner != address(0), "DatasetRegistry: unknown dataset");

        d.trusted = trusted;
        d.updatedAt = uint64(block.number);

        emit DatasetTrustedChanged(datasetId, trusted);
    }

    /// @notice Forcefully set active flag (MasterKey only).
    function forceSetActive(uint256 datasetId, bool active)
        external
        onlyMaster
    {
        Dataset storage d = datasets[datasetId];
        require(d.owner != address(0), "DatasetRegistry: unknown dataset");

        d.active = active;
        d.updatedAt = uint64(block.number);

        emit DatasetStatusChanged(datasetId, active);
    }

    /// @notice Transfer dataset ownership (MasterKey only; for key rotation, etc.).
    function transferOwnership(uint256 datasetId, address newOwner)
        external
        onlyMaster
    {
        require(newOwner != address(0), "DatasetRegistry: newOwner zero");
        Dataset storage d = datasets[datasetId];
        address oldOwner = d.owner;
        require(oldOwner != address(0), "DatasetRegistry: unknown dataset");

        d.owner = newOwner;
        d.updatedAt = uint64(block.number);

        emit DatasetOwnerChanged(datasetId, oldOwner, newOwner);
    }

    /// @notice Change MasterKey.
    function setMasterKey(address newMasterKey) external onlyMaster {
        require(newMasterKey != address(0), "DatasetRegistry: masterKey zero");
        address old = masterKey;
        masterKey = newMasterKey;
        emit MasterKeyChanged(old, newMasterKey);
    }

    /// @notice Convenience view that returns the full dataset struct.
    function getDataset(uint256 datasetId)
        external
        view
        returns (
            bytes32 datasetKey,
            address owner,
            bytes32 contentHash,
            string memory metadataURI,
            bool active,
            bool trusted,
            uint64 createdAt,
            uint64 updatedAt
        )
    {
        Dataset storage d = datasets[datasetId];
        require(d.owner != address(0), "DatasetRegistry: unknown dataset");

        return (
            d.datasetKey,
            d.owner,
            d.contentHash,
            d.metadataURI,
            d.active,
            d.trusted,
            d.createdAt,
            d.updatedAt
        );
    }
}
