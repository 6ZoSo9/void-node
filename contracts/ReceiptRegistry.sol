// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReceiptRegistry (v1, minimal)
/// @notice On-chain registry for AI job receipts on VOID (chainId 2050+).
///         - Anchors hashes for job input/output/model.
///         - References JobQueue jobs by jobId.
///         - Optionally enforces AgentRegistry-based authorization.
interface IJobQueue {
    function jobExists(bytes32 jobId) external view returns (bool);
}

interface IAgentRegistry {
    function isAuthorized(address agentAddr, string calldata modelId) external view returns (bool);
}

contract ReceiptRegistry {
    /// @notice Admin address (typically AdminGate-controlled).
    address public admin;

    /// @notice JobQueue contract used to validate job existence.
    address public jobQueue;

    /// @notice Optional AgentRegistry used to authorize agents per model.
    address public agentRegistry;

    struct Receipt {
        bytes32 jobId;        // JobQueue jobId (canonical)
        bytes32 receiptId;    // Unique id for this receipt
        address agent;        // Who submitted this receipt (msg.sender)
        string  modelId;      // Human-readable model identifier
        bytes32 inputHash;    // Hash of input payload (CBOR manifest, etc.)
        bytes32 outputHash;   // Hash of output payload (result manifest / transcript)
        bytes32 modelHash;    // Hash of model version / weights / manifest
        uint64  chainId;      // Chain id (e.g. 2050)
        uint64  createdAt;    // Block timestamp when receipt was recorded
        uint8   status;       // 0=pending, 1=completed, 2=failed, etc.
    }

    struct ReceiptInput {
        bytes32 jobId;
        string  modelId;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 modelHash;
        uint8   status;
    }

    /// @notice Direct lookup by receiptId.
    mapping(bytes32 => Receipt) public receipts;

    /// @notice For each jobId, list of receiptIds.
    mapping(bytes32 => bytes32[]) private _receiptsByJob;

    /// @notice Total receipts ever submitted (devnet-friendly counter).
    uint256 public totalReceipts;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event JobQueueChanged(address indexed oldJobQueue, address indexed newJobQueue);
    event AgentRegistryChanged(address indexed oldAgentRegistry, address indexed newAgentRegistry);

    event ReceiptSubmitted(
        bytes32 indexed jobId,
        bytes32 indexed receiptId,
        address indexed agent,
        string  modelId,
        uint8   status
    );

    event ReceiptStatusUpdated(
        bytes32 indexed receiptId,
        uint8   oldStatus,
        uint8   newStatus
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "ReceiptRegistry: not admin");
        _;
    }

    constructor(address admin_, address jobQueue_, address agentRegistry_) {
        require(admin_ != address(0), "ReceiptRegistry: admin zero");
        admin = admin_;
        jobQueue = jobQueue_;
        agentRegistry = agentRegistry_;
    }

    // --- Admin configuration ---

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "ReceiptRegistry: new admin zero");
        address old = admin;
        admin = newAdmin;
        emit AdminChanged(old, newAdmin);
    }

    function setJobQueue(address newJobQueue) external onlyAdmin {
        address old = jobQueue;
        jobQueue = newJobQueue;
        emit JobQueueChanged(old, newJobQueue);
    }

    function setAgentRegistry(address newAgentRegistry) external onlyAdmin {
        address old = agentRegistry;
        agentRegistry = newAgentRegistry;
        emit AgentRegistryChanged(old, newAgentRegistry);
    }

    // --- Core logic ---

    /// @notice Submit a new receipt for a JobQueue job.
    ///         - Requires jobQueue.jobExists(jobId).
    ///         - If agentRegistry is set, requires isAuthorized(msg.sender, modelId).
    function submitReceipt(ReceiptInput calldata r) external returns (bytes32 receiptId) {
        require(jobQueue != address(0), "ReceiptRegistry: jobQueue not set");

        // Validate job existence
        require(IJobQueue(jobQueue).jobExists(r.jobId), "ReceiptRegistry: job does not exist");

        // Optional agent authorization
        if (agentRegistry != address(0)) {
            bool ok = IAgentRegistry(agentRegistry).isAuthorized(msg.sender, r.modelId);
            require(ok, "ReceiptRegistry: agent not authorized");
        }

        // Derive a deterministic-ish id for this receipt
        receiptId = keccak256(
            abi.encode(
                r.jobId,
                msg.sender,
                r.inputHash,
                r.outputHash,
                block.timestamp,
                block.number
            )
        );

        // Prevent duplicates
        require(receipts[receiptId].createdAt == 0, "ReceiptRegistry: duplicate receiptId");

        Receipt storage rec = receipts[receiptId];
        rec.jobId     = r.jobId;
        rec.receiptId = receiptId;
        rec.agent     = msg.sender;
        rec.modelId   = r.modelId;
        rec.inputHash = r.inputHash;
        rec.outputHash = r.outputHash;
        rec.modelHash  = r.modelHash;
        rec.chainId   = uint64(block.chainid);
        rec.createdAt = uint64(block.timestamp);
        rec.status    = r.status;
        totalReceipts += 1;

        _receiptsByJob[r.jobId].push(receiptId);

        emit ReceiptSubmitted(r.jobId, receiptId, msg.sender, r.modelId, r.status);
    }

    /// @notice Get all receiptIds associated with a jobId.
    function getReceiptsForJob(bytes32 jobId) external view returns (bytes32[] memory) {
        return _receiptsByJob[jobId];
    }

    /// @notice Admin can update receipt status (e.g. disputed/invalid).
    function markReceiptStatus(bytes32 receiptId, uint8 newStatus) external onlyAdmin {
        Receipt storage rec = receipts[receiptId];
        require(rec.createdAt != 0, "ReceiptRegistry: unknown receipt");
        uint8 old = rec.status;
        rec.status = newStatus;
        emit ReceiptStatusUpdated(receiptId, old, newStatus);
    }


}
