// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for the VOID JobQueue used by devnet.
interface IJobQueue {
    function jobs(uint256 id)
        external
        view
        returns (
            address poster,
            address worker,
            string memory appId,
            string memory modelId,
            bytes32 payloadHash,
            bytes32 resultHash,
            uint8 status,
            uint64 createdAt,
            uint64 completedAt
        );
}

/// @notice VOID Network – ReceiptRegistry / PoPRegistry (v1, devnet)
/// Chain: VOID devnet (chainId 2050)
///
/// Responsibilities:
/// - Track which (jobQueue, jobId) pairs have an on-chain Proof-of-Processing
///   recorded by an off-chain agent.
/// - Verify receipts against the canonical JobQueue contract.
/// - Keep state small: only hashes + minimal metadata.
contract ReceiptRegistry {
    struct Receipt {
        address jobQueue;
        uint256 jobId;
        address poster;
        address worker;
        bytes32 payloadHash;
        bytes32 resultHash;
        bytes32 appKey; // keccak256(appId) or other stable app key
    }

    /// @notice Admin address (controls allowed job queues).
    address public admin;

    /// @notice Which JobQueue contracts are allowed to be referenced.
    mapping(address => bool) public allowedJobQueues;

    /// @notice Whether a given (jobQueue, jobId) already has a recorded receipt.
    mapping(address => mapping(uint256 => bool)) public hasReceipt;

    /// @dev Stored receipts. Use getReceipt() to read.
    mapping(address => mapping(uint256 => Receipt)) private _receipts;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event AllowedJobQueueUpdated(address indexed jobQueue, bool allowed);
    event ReceiptRecorded(
        address indexed jobQueue,
        uint256 indexed jobId,
        address indexed worker,
        bytes32 appKey
    );

    error NotAdmin();
    error ZeroAdmin();
    error JobQueueNotAllowed();
    error ReceiptAlreadyExists();
    error JobNotCompleted();
    error WorkerMismatch();
    error CallerNotWorker();
    error PayloadHashMismatch();
    error ResultHashMismatch();

    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAdmin();
        admin = _admin;
        emit AdminChanged(address(0), _admin);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @notice Change the admin address.
    function setAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAdmin();
        address old = admin;
        admin = newAdmin;
        emit AdminChanged(old, newAdmin);
    }

    /// @notice Allow or disallow a JobQueue contract.
    function setAllowedJobQueue(address jobQueue, bool allowed) external onlyAdmin {
        allowedJobQueues[jobQueue] = allowed;
        emit AllowedJobQueueUpdated(jobQueue, allowed);
    }

    /// @notice Record a PoP receipt for a completed job.
    ///
    /// Requirements:
    /// - jobQueue must be allowed.
    /// - hasReceipt(jobQueue, jobId) must be false.
    /// - JobQueue(jobId).status must be Completed (3).
    /// - worker must match the JobQueue recorded worker.
    /// - msg.sender must be the worker (agent).
    /// - payloadHash/resultHash must match JobQueue.
    function recordReceipt(
        address jobQueue,
        uint256 jobId,
        address worker,
        bytes32 payloadHash,
        bytes32 resultHash,
        bytes32 appKey
    ) external {
        if (!allowedJobQueues[jobQueue]) revert JobQueueNotAllowed();
        if (hasReceipt[jobQueue][jobId]) revert ReceiptAlreadyExists();

        IJobQueue jq = IJobQueue(jobQueue);
        (
            address posterOnchain,
            address workerOnchain,
            /* string memory appIdOnchain */,
            /* string memory modelIdOnchain */,
            bytes32 payloadOnchain,
            bytes32 resultOnchain,
            uint8 statusOnchain,
            /* uint64 createdAt */,
            /* uint64 completedAt */
        ) = jq.jobs(jobId);

        // status 3 == Completed in our JobQueue devnet
        if (statusOnchain != 3) revert JobNotCompleted();
        if (workerOnchain != worker) revert WorkerMismatch();
        if (worker != msg.sender) revert CallerNotWorker();
        if (payloadOnchain != payloadHash) revert PayloadHashMismatch();
        if (resultOnchain != resultHash) revert ResultHashMismatch();

        Receipt memory r = Receipt({
            jobQueue: jobQueue,
            jobId: jobId,
            poster: posterOnchain,
            worker: worker,
            payloadHash: payloadHash,
            resultHash: resultHash,
            appKey: appKey
        });

        _receipts[jobQueue][jobId] = r;
        hasReceipt[jobQueue][jobId] = true;

        emit ReceiptRecorded(jobQueue, jobId, worker, appKey);
    }

    /// @notice Get the stored receipt for (jobQueue, jobId).
    function getReceipt(address jobQueue, uint256 jobId)
        external
        view
        returns (Receipt memory)
    {
        return _receipts[jobQueue][jobId];
    }
}
