// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface to your existing JobQueue on devnet.
interface IJobQueue {
    struct Job {
        address poster;
        address worker;
        string  appId;
        string  modelId;
        bytes32 payloadHash;
        bytes32 resultHash;
        uint8   status;     // 0=None,1=Posted,2=Claimed,3=Completed
        uint64  createdAt;  // seconds
        uint64  updatedAt;  // seconds
    }

    function jobs(uint256 id) external view returns (Job memory);
}

/// @title ReceiptRegistry / PoPRegistry v1
/// @notice Records "this job was actually processed and matches JobQueue".
contract ReceiptRegistry {
    struct Receipt {
        address jobQueue;
        uint256 jobId;

        address poster;
        address worker;

        bytes32 payloadHash;
        bytes32 resultHash;

        bytes32 appKey;    // keccak256(appId)
        bytes32 modelKey;  // keccak256(modelId)

        uint64 postedAt;
        uint64 completedAt;
        uint64 recordedAt;
    }

    // -------- Errors --------

    error NotAdmin();
    error JobQueueNotAllowed(address jobQueue);
    error ReceiptAlreadyExists(address jobQueue, uint256 jobId);
    error JobNotCompleted(address jobQueue, uint256 jobId, uint8 status);
    error WorkerMismatch(address expected, address actual);
    error ResultHashMismatch(bytes32 expected, bytes32 actual);
    error PayloadHashMismatch(bytes32 expected, bytes32 actual);

    // -------- Events --------

    event ReceiptRecorded(
        address indexed jobQueue,
        uint256 indexed jobId,
        address indexed worker,
        bytes32 appKey,
        bytes32 modelKey,
        bytes32 payloadHash,
        bytes32 resultHash,
        uint64 postedAt,
        uint64 completedAt,
        uint64 recordedAt
    );

    event AllowedJobQueueUpdated(address jobQueue, bool allowed);
    event ModelRegistryUpdated(address modelRegistry);
    event AdminUpdated(address newAdmin);

    // -------- Storage --------

    // key = keccak256(jobQueue, jobId)
    mapping(bytes32 => Receipt) public receipts;
    mapping(bytes32 => bool) public receiptExists;

    address public admin;
    mapping(address => bool) public allowedJobQueues;
    address public modelRegistry; // reserved for future use

    // -------- Admin --------

    constructor(address _admin) {
        admin = _admin;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert NotAdmin();
        }
        _;
    }

    // -------- Record API --------

    struct RecordArgs {
        address jobQueue;
        uint256 jobId;
        address worker;
        bytes32 resultHash;
        // Optional extra safety; 0x0 = "don't check payload hash"
        bytes32 expectedPayloadHash;
    }

    /// @notice Record a PoP receipt for a COMPLETED job in JobQueue.
    /// - Verifies job status = Completed (3)
    /// - Verifies worker and resultHash match JobQueue
    /// - Optionally verifies payloadHash (if expectedPayloadHash != 0)
    /// - Derives appKey/modelKey off-chain (keccak256 of strings)
    function recordReceipt(RecordArgs calldata args) external {
        if (!allowedJobQueues[args.jobQueue]) {
            revert JobQueueNotAllowed(args.jobQueue);
        }

        bytes32 key = keccak256(abi.encodePacked(args.jobQueue, args.jobId));
        if (receiptExists[key]) {
            revert ReceiptAlreadyExists(args.jobQueue, args.jobId);
        }

        IJobQueue jq = IJobQueue(args.jobQueue);
        IJobQueue.Job memory j = jq.jobs(args.jobId);

        // status must be Completed (3)
        if (j.status != 3) {
            revert JobNotCompleted(args.jobQueue, args.jobId, j.status);
        }

        // worker must match JobQueue
        if (j.worker != args.worker) {
            revert WorkerMismatch(j.worker, args.worker);
        }

        // resultHash must match JobQueue
        if (j.resultHash != args.resultHash) {
            revert ResultHashMismatch(j.resultHash, args.resultHash);
        }

        // optional payload hash safety
        if (args.expectedPayloadHash != bytes32(0) && j.payloadHash != args.expectedPayloadHash) {
            revert PayloadHashMismatch(j.payloadHash, args.expectedPayloadHash);
        }

        bytes32 appKey = keccak256(bytes(j.appId));
        bytes32 modelKey = keccak256(bytes(j.modelId));

        Receipt storage r = receipts[key];
        r.jobQueue    = args.jobQueue;
        r.jobId       = args.jobId;
        r.poster      = j.poster;
        r.worker      = j.worker;
        r.payloadHash = j.payloadHash;
        r.resultHash  = j.resultHash;
        r.appKey      = appKey;
        r.modelKey    = modelKey;
        r.postedAt    = j.createdAt;
        r.completedAt = j.updatedAt;
        r.recordedAt  = uint64(block.timestamp);

        receiptExists[key] = true;

        emit ReceiptRecorded(
            args.jobQueue,
            args.jobId,
            j.worker,
            appKey,
            modelKey,
            j.payloadHash,
            j.resultHash,
            j.createdAt,
            j.updatedAt,
            uint64(block.timestamp)
        );
    }

    // -------- Views --------

    function hasReceipt(address jobQueue, uint256 jobId) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(jobQueue, jobId));
        return receiptExists[key];
    }

    function getReceipt(address jobQueue, uint256 jobId) external view returns (Receipt memory) {
        bytes32 key = keccak256(abi.encodePacked(jobQueue, jobId));
        return receipts[key];
    }

    function getReceiptKey(address jobQueue, uint256 jobId) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(jobQueue, jobId));
    }

    // -------- Admin setters --------

    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
        emit AdminUpdated(newAdmin);
    }

    function setAllowedJobQueue(address jobQueue, bool allowed) external onlyAdmin {
        allowedJobQueues[jobQueue] = allowed;
        emit AllowedJobQueueUpdated(jobQueue, allowed);
    }

    function setModelRegistry(address _modelRegistry) external onlyAdmin {
        modelRegistry = _modelRegistry;
        emit ModelRegistryUpdated(_modelRegistry);
    }
}
