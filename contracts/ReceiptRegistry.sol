// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID ReceiptRegistry v1
/// @notice Minimal on-chain registry of job receipts for VOID.
/// @dev Links jobId/agentId/modelId/datasetId to result/proof hashes. No on-chain verification.
contract ReceiptRegistry {
    enum ReceiptStatus {
        Unknown,
        Success,
        Failed,
        Partial
    }

    struct Receipt {
        uint256 jobId;
        uint256 agentId;
        uint256 modelId;
        uint256 datasetId;
        address submitter;
        bytes32 resultHash;
        bytes32 proofHash;
        string metadataURI;
        ReceiptStatus status;
        uint64 createdAt;
    }

    /// @notice Monotonically increasing receipt id (1-based).
    uint256 public nextReceiptId;

    /// @notice Registry of receipts by id.
    mapping(uint256 => Receipt) public receipts;

    event ReceiptRecorded(
        uint256 indexed receiptId,
        uint256 indexed jobId,
        uint256 indexed agentId,
        uint256 modelId,
        uint256 datasetId,
        address submitter,
        bytes32 resultHash,
        bytes32 proofHash,
        ReceiptStatus status
    );

    event ReceiptUpdated(
        uint256 indexed receiptId,
        bytes32 resultHash,
        bytes32 proofHash,
        string metadataURI,
        ReceiptStatus status
    );

    /// @notice Contract version (not job/model version).
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @notice Record a new receipt.
    /// @param jobId Job id from JobQueue (off-chain infra is responsible for consistency).
    /// @param agentId Agent id from AgentRegistry (optional; 0 if not used).
    /// @param modelId Model id from ModelRegistry (optional; 0 if not used).
    /// @param datasetId Dataset id from DatasetRegistry (optional; 0 if not used).
    /// @param resultHash Hash of the result payload or commit.
    /// @param proofHash Hash of any proof/attestation bundle (can be 0x0 if none).
    /// @param metadataURI Off-chain JSON with richer metadata.
    /// @param status High-level outcome (Success/Failed/Partial).
    /// @return receiptId Newly assigned receipt id.
    function recordReceipt(
        uint256 jobId,
        uint256 agentId,
        uint256 modelId,
        uint256 datasetId,
        bytes32 resultHash,
        bytes32 proofHash,
        string calldata metadataURI,
        ReceiptStatus status
    ) external returns (uint256 receiptId) {
        require(status != ReceiptStatus.Unknown, "ReceiptRegistry: bad status");

        receiptId = ++nextReceiptId;

        Receipt storage r = receipts[receiptId];
        r.jobId = jobId;
        r.agentId = agentId;
        r.modelId = modelId;
        r.datasetId = datasetId;
        r.submitter = msg.sender;
        r.resultHash = resultHash;
        r.proofHash = proofHash;
        r.metadataURI = metadataURI;
        r.status = status;
        r.createdAt = uint64(block.number);

        emit ReceiptRecorded(
            receiptId,
            jobId,
            agentId,
            modelId,
            datasetId,
            msg.sender,
            resultHash,
            proofHash,
            status
        );
    }

    /// @notice Update hashes/metadata/status for an existing receipt (submitter only).
    function updateReceipt(
        uint256 receiptId,
        bytes32 resultHash,
        bytes32 proofHash,
        string calldata metadataURI,
        ReceiptStatus status
    ) external {
        require(status != ReceiptStatus.Unknown, "ReceiptRegistry: bad status");

        Receipt storage r = receipts[receiptId];
        require(r.submitter != address(0), "ReceiptRegistry: unknown receipt");
        require(r.submitter == msg.sender, "ReceiptRegistry: not submitter");

        r.resultHash = resultHash;
        r.proofHash = proofHash;
        r.metadataURI = metadataURI;
        r.status = status;

        emit ReceiptUpdated(
            receiptId,
            resultHash,
            proofHash,
            metadataURI,
            status
        );
    }

    /// @notice Convenience view that returns the full receipt struct.
    function getReceipt(uint256 receiptId)
        external
        view
        returns (
            uint256 jobId,
            uint256 agentId,
            uint256 modelId,
            uint256 datasetId,
            address submitter,
            bytes32 resultHash,
            bytes32 proofHash,
            string memory metadataURI,
            ReceiptStatus status,
            uint64 createdAt
        )
    {
        Receipt storage r = receipts[receiptId];
        require(r.submitter != address(0), "ReceiptRegistry: unknown receipt");

        return (
            r.jobId,
            r.agentId,
            r.modelId,
            r.datasetId,
            r.submitter,
            r.resultHash,
            r.proofHash,
            r.metadataURI,
            r.status,
            r.createdAt
        );
    }
}
