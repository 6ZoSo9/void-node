// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title JobQueue v1 (minimal)
/// @notice On-chain job registry for VOID agents and off-chain workers.
contract JobQueue {
    enum JobStatus {
        Posted,
        Claimed,
        Completed,
        Cancelled,
        Expired
    }

    struct Job {
        address poster;
        bytes32 appTag;
        string payloadType;
        bytes32 payloadHash;
        string modelHint;
        bytes32 policyTag;
        uint256 budget;
        uint64 createdAt;
        uint64 expiresAt;
        JobStatus status;
        address claimer;
        bytes32 receiptHash;
        string receiptMeta;
        uint256 parentJobId;
        uint16 stepIndex;
    }

    uint256 public nextJobId;
    mapping(uint256 => Job) public jobs;

    address public admin; // or AdminGate in real VOID

    event JobPosted(
        uint256 jobId,
        address poster,
        bytes32 appTag,
        string payloadType,
        bytes32 payloadHash,
        string modelHint,
        bytes32 policyTag,
        uint256 budget,
        uint64 expiresAt,
        uint256 parentJobId,
        uint16 stepIndex
    );

    event JobClaimed(
        uint256 jobId,
        address claimer
    );

    event JobCompleted(
        uint256 jobId,
        address claimer,
        bytes32 receiptHash
    );

    event JobCancelled(
        uint256 jobId,
        address caller
    );

    event JobExpired(
        uint256 jobId
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "JobQueue: not admin");
        _;
    }

    constructor(address _admin) {
        admin = _admin;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "JobQueue: zero admin");
        admin = newAdmin;
    }

    // -------- Views --------

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getStatus(uint256 jobId) external view returns (JobStatus) {
        return jobs[jobId].status;
    }

    function getPoster(uint256 jobId) external view returns (address) {
        return jobs[jobId].poster;
    }

    function getClaimer(uint256 jobId) external view returns (address) {
        return jobs[jobId].claimer;
    }

    function getReceipt(
        uint256 jobId
    ) external view returns (bytes32 receiptHash, string memory receiptMeta) {
        Job storage j = jobs[jobId];
        return (j.receiptHash, j.receiptMeta);
    }

    // -------- Core flows --------

    /// @notice Post a new job.
    function postJob(
        bytes32 appTag,
        string memory payloadType,
        bytes32 payloadHash,
        string memory modelHint,
        bytes32 policyTag,
        uint256 budget,
        uint64 expiresAt,
        uint256 parentJobId,
        uint16 stepIndex
    ) external returns (uint256 jobId) {
        require(payloadHash != bytes32(0), "JobQueue: empty payload hash");
        if (expiresAt != 0) {
            require(expiresAt > block.timestamp, "JobQueue: expiry in past");
        }

        jobId = ++nextJobId;

        Job storage j = jobs[jobId];
        j.poster = msg.sender;
        j.appTag = appTag;
        j.payloadType = payloadType;
        j.payloadHash = payloadHash;
        j.modelHint = modelHint;
        j.policyTag = policyTag;
        j.budget = budget;
        j.createdAt = uint64(block.timestamp);
        j.expiresAt = expiresAt;
        j.status = JobStatus.Posted;
        j.parentJobId = parentJobId;
        j.stepIndex = stepIndex;

        emit JobPosted(
            jobId,
            msg.sender,
            appTag,
            payloadType,
            payloadHash,
            modelHint,
            policyTag,
            budget,
            expiresAt,
            parentJobId,
            stepIndex
        );
    }

    /// @notice Claim a job for execution.
    /// @dev v1: any caller may claim; policy is enforced off-chain.
    function claimJob(uint256 jobId) external {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.Posted, "JobQueue: not posted");
        if (j.expiresAt != 0) {
            require(block.timestamp < j.expiresAt, "JobQueue: expired");
        }

        j.status = JobStatus.Claimed;
        j.claimer = msg.sender;

        emit JobClaimed(jobId, msg.sender);
    }

    /// @notice Mark a claimed job as completed and record a receipt hash.
    function completeJob(
        uint256 jobId,
        bytes32 receiptHash,
        string memory receiptMeta
    ) external {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.Claimed, "JobQueue: not claimed");
        require(
            msg.sender == j.claimer || msg.sender == admin,
            "JobQueue: not claimer/admin"
        );
        require(receiptHash != bytes32(0), "JobQueue: empty receipt hash");

        j.status = JobStatus.Completed;
        j.receiptHash = receiptHash;
        j.receiptMeta = receiptMeta;

        emit JobCompleted(jobId, j.claimer, receiptHash);
    }

    /// @notice Cancel a job (by poster or admin).
    function cancelJob(uint256 jobId) external {
        Job storage j = jobs[jobId];
        require(
            msg.sender == j.poster || msg.sender == admin,
            "JobQueue: not poster/admin"
        );
        require(
            j.status == JobStatus.Posted || j.status == JobStatus.Claimed,
            "JobQueue: cannot cancel"
        );

        j.status = JobStatus.Cancelled;
        emit JobCancelled(jobId, msg.sender);
    }

    /// @notice Explicitly mark a job as expired (admin helper).
    function markExpired(uint256 jobId) external onlyAdmin {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.Posted, "JobQueue: not posted");
        require(j.expiresAt != 0, "JobQueue: no expiry");
        require(block.timestamp >= j.expiresAt, "JobQueue: not yet expired");

        j.status = JobStatus.Expired;
        emit JobExpired(jobId);
    }
}
