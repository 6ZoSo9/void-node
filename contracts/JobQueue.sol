// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for the ModelRegistry used by JobQueue.
interface IModelRegistry {
    function isActive(string calldata modelId) external view returns (bool);
}

/// @notice VOID Network - JobQueue (v1, model-aware)
/// Every job references a modelId that must be active in the ModelRegistry
/// at the time of posting.
contract JobQueue {
    // --- Errors ---

    error NotAdmin();
    error NotWorker();
    error NotAuthorized();
    error InvalidStatus();
    error ModelNotActive();

    // --- Types ---

    enum Status {
        None,
        Posted,
        Claimed,
        Completed,
        Cancelled
    }

    struct Job {
        address poster;
        address worker;
        string  appId;
        string  modelId;
        bytes32 payloadHash;
        bytes32 resultHash;
        Status  status;
        uint64  createdAt;
        uint64  updatedAt;
    }

    // --- Events ---

    event JobPosted(
        uint256 indexed jobId,
        address indexed poster,
        string appId,
        string modelId,
        bytes32 payloadHash
    );

    event JobClaimed(
        uint256 indexed jobId,
        address indexed worker
    );

    event JobCompleted(
        uint256 indexed jobId,
        address indexed worker,
        bytes32 resultHash
    );

    event JobCancelled(
        uint256 indexed jobId,
        address indexed caller
    );

    event ModelRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    // --- Storage ---

    address public admin;
    IModelRegistry public modelRegistry;

    uint256 public nextJobId;
    mapping(uint256 => Job) public jobs;

    // --- Modifiers ---

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // --- Constructor ---

    constructor(address admin_, address modelRegistry_) {
        if (admin_ == address(0)) revert NotAdmin();
        admin = admin_;
        modelRegistry = IModelRegistry(modelRegistry_);
    }

    // --- Admin ---

    function setModelRegistry(address newRegistry) external onlyAdmin {
        address old = address(modelRegistry);
        modelRegistry = IModelRegistry(newRegistry);
        emit ModelRegistryUpdated(old, newRegistry);
    }

    // --- Core API ---

    /// @notice Post a new job bound to a specific modelId.
    /// Reverts if the model is not active in ModelRegistry.
    function postJob(
        string calldata appId,
        string calldata modelId,
        bytes32 payloadHash
    ) external returns (uint256 jobId) {
        if (!modelRegistry.isActive(modelId)) {
            revert ModelNotActive();
        }

        jobId = ++nextJobId;
        uint64 ts = uint64(block.timestamp);

        Job storage j = jobs[jobId];
        j.poster      = msg.sender;
        j.worker      = address(0);
        j.appId       = appId;
        j.modelId     = modelId;
        j.payloadHash = payloadHash;
        j.resultHash  = bytes32(0);
        j.status      = Status.Posted;
        j.createdAt   = ts;
        j.updatedAt   = ts;

        emit JobPosted(jobId, msg.sender, appId, modelId, payloadHash);
    }

    /// @notice Claim a job as a worker.
    function claimJob(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.status != Status.Posted) revert InvalidStatus();

        j.worker    = msg.sender;
        j.status    = Status.Claimed;
        j.updatedAt = uint64(block.timestamp);

        emit JobClaimed(jobId, msg.sender);
    }

    /// @notice Complete a job, providing a result hash.
    /// Only the worker OR the admin can complete.
    function completeJob(uint256 jobId, bytes32 resultHash) external {
        Job storage j = jobs[jobId];
        if (j.status != Status.Claimed) revert InvalidStatus();

        if (msg.sender != j.worker && msg.sender != admin) {
            revert NotWorker();
        }

        j.resultHash = resultHash;
        j.status     = Status.Completed;
        j.updatedAt  = uint64(block.timestamp);

        emit JobCompleted(jobId, j.worker, resultHash);
    }

    /// @notice Cancel a job (poster or admin).
    function cancelJob(uint256 jobId) external {
        Job storage j = jobs[jobId];

        if (j.status != Status.Posted && j.status != Status.Claimed) {
            revert InvalidStatus();
        }

        if (msg.sender != j.poster && msg.sender != admin) {
            revert NotAuthorized();
        }

        j.status    = Status.Cancelled;
        j.updatedAt = uint64(block.timestamp);

        emit JobCancelled(jobId, msg.sender);
    }
}
