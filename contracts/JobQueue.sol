// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID JobQueue (v1, minimal)
/// @notice On-chain job registry for VOID (chainId 2050).
///         Users/contracts post jobs; off-chain agents claim and complete them.
contract JobQueue {
    enum JobStatus {
        None,
        Posted,
        Claimed,
        Completed,
        Failed,
        Cancelled,
        Expired
    }

    struct Job {
        bytes32 jobId;
        uint256 chainId;
        string modelId;
        address postedBy;
        string appTag;
        bytes32 payloadHash;
        uint64 createdAt;
        JobStatus status;
        address agent;
        bytes32 resultHash;
        uint64 completedAt;
        uint32 errorCode;
    }

    /// @notice Admin can adjust policy (timeouts etc.). Devnet: simple EOA.
    address public admin;

    /// @dev Simple nonce to help derive unique job IDs.
    uint256 private _jobNonce;
    uint256 public totalJobs;

    /// @dev jobId => Job
    mapping(bytes32 => Job) private _jobs;

    event JobPosted(
        bytes32 indexed jobId,
        uint256 chainId,
        string modelId,
        address indexed postedBy,
        string appTag,
        bytes32 payloadHash,
        uint64 createdAt
    );

    event JobClaimed(
        bytes32 indexed jobId,
        address indexed agent,
        uint64 claimedAt
    );

    event JobCompleted(
        bytes32 indexed jobId,
        address indexed agent,
        bytes32 resultHash,
        uint64 completedAt
    );

    event JobFailed(
        bytes32 indexed jobId,
        address indexed agent,
        uint32 errorCode,
        uint64 failedAt
    );

    event JobCancelled(
        bytes32 indexed jobId,
        address indexed cancelledBy,
        uint32 errorCode,
        uint64 cancelledAt
    );

    event JobExpired(
        bytes32 indexed jobId,
        uint32 errorCode,
        uint64 expiredAt
    );

    event AdminChanged(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "JobQueue: not admin");
        _;
    }

    modifier onlyExisting(bytes32 jobId) {
        require(_jobs[jobId].status != JobStatus.None, "JobQueue: unknown job");
        _;
    }

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "JobQueue: admin=0");
        admin = initialAdmin;
        emit AdminChanged(address(0), initialAdmin);
    }

    // --- Admin ---

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "JobQueue: admin=0");
        address prev = admin;
        admin = newAdmin;
        emit AdminChanged(prev, newAdmin);
    }

    // --- Core job lifecycle ---

    /// @notice Post a new job for off-chain agents.
    /// @param modelId  ID registered in ModelRegistry.
    /// @param payloadHash Hash of off-chain payload (compressed+encrypted).
    /// @param appTag  Optional app namespace (e.g. "nullfeed", "wallet-oracle").
    function postJob(
        string calldata modelId,
        bytes32 payloadHash,
        string calldata appTag
    ) external payable returns (bytes32 jobId) {
        require(bytes(modelId).length != 0, "JobQueue: empty modelId");

        // NOTE: chainId is taken from the current chain; VOID should be 2050.
        uint256 chainId_ = block.chainid;

        // Derive a unique jobId. This is deterministic and collision-resistant
        // enough for our purposes.
        jobId = keccak256(
            abi.encodePacked(
                address(this),
                msg.sender,
                chainId_,
                block.number,
                _jobNonce++
            )
        );

        Job storage j = _jobs[jobId];
        j.jobId = jobId;
        j.chainId = chainId_;
        j.modelId = modelId;
        j.postedBy = msg.sender;
        j.appTag = appTag;
        j.payloadHash = payloadHash;
        j.createdAt = uint64(block.timestamp);
        j.status = JobStatus.Posted;
        totalJobs += 1;

        emit JobPosted(
            jobId,
            chainId_,
            modelId,
            msg.sender,
            appTag,
            payloadHash,
            j.createdAt
        );
    }

    /// @notice Claim a job for processing.
    function claimJob(bytes32 jobId)
        external
        onlyExisting(jobId)
    {
        Job storage j = _jobs[jobId];
        require(j.status == JobStatus.Posted, "JobQueue: not claimable");

        j.status = JobStatus.Claimed;
        j.agent = msg.sender;

        emit JobClaimed(jobId, msg.sender, uint64(block.timestamp));
    }

    /// @notice Complete a job and store a result hash.
    function completeJob(bytes32 jobId, bytes32 resultHash)
        external
        onlyExisting(jobId)
    {
        Job storage j = _jobs[jobId];
        require(j.status == JobStatus.Claimed, "JobQueue: not claimed");
        require(j.agent == msg.sender, "JobQueue: not agent");

        j.status = JobStatus.Completed;
        j.resultHash = resultHash;
        j.completedAt = uint64(block.timestamp);

        emit JobCompleted(jobId, msg.sender, resultHash, j.completedAt);
    }

    /// @notice Mark a job as failed with an error code.
    function failJob(bytes32 jobId, uint32 errorCode)
        external
        onlyExisting(jobId)
    {
        Job storage j = _jobs[jobId];
        require(j.status == JobStatus.Claimed, "JobQueue: not claimed");
        require(j.agent == msg.sender, "JobQueue: not agent");

        j.status = JobStatus.Failed;
        j.errorCode = errorCode;
        j.completedAt = uint64(block.timestamp);

        emit JobFailed(jobId, msg.sender, errorCode, j.completedAt);
    }

    /// @notice Cancel a job. Poster or admin may cancel.
    function cancelJob(bytes32 jobId, uint32 errorCode)
        external
        onlyExisting(jobId)
    {
        Job storage j = _jobs[jobId];
        require(
            msg.sender == j.postedBy || msg.sender == admin,
            "JobQueue: not poster/admin"
        );
        require(
            j.status == JobStatus.Posted || j.status == JobStatus.Claimed,
            "JobQueue: cannot cancel"
        );

        j.status = JobStatus.Cancelled;
        j.errorCode = errorCode;
        j.completedAt = uint64(block.timestamp);

        emit JobCancelled(jobId, msg.sender, errorCode, j.completedAt);
    }

    /// @notice Expire an old job that has not been completed.
    /// @dev v1: simple time-based rule. In future we may store per-job or
    ///          global timeout parameters.
    function expireJob(bytes32 jobId, uint32 errorCode)
        external
        onlyExisting(jobId)
    {
        Job storage j = _jobs[jobId];
        require(
            j.status == JobStatus.Posted || j.status == JobStatus.Claimed,
            "JobQueue: cannot expire"
        );

        // Very simple rule to start with; callers must enforce their own policy.
        // We purposely do not fix a constant timeout here to keep v1 flexible.
        j.status = JobStatus.Expired;
        j.errorCode = errorCode;
        j.completedAt = uint64(block.timestamp);

        emit JobExpired(jobId, errorCode, j.completedAt);
    }

    // --- Views / helpers ---

    function getJob(bytes32 jobId)
        external
        view
        returns (Job memory)
    {
        require(_jobs[jobId].status != JobStatus.None, "JobQueue: unknown job");
        return _jobs[jobId];
    }

    function getJobStatus(bytes32 jobId)
        external
        view
        returns (JobStatus)
    {
        return _jobs[jobId].status;
    }

    function hasResult(bytes32 jobId)
        external
        view
        returns (bool)
    {
        JobStatus s = _jobs[jobId].status;
        return (s == JobStatus.Completed || s == JobStatus.Failed);
    }

    /// @notice Returns true if a job exists (status != None).
    /// @dev Used by ReceiptRegistry on devnet to validate job references.
    function jobExists(bytes32 jobId) external view returns (bool) {
        return _jobs[jobId].status != JobStatus.None;
    }

}
