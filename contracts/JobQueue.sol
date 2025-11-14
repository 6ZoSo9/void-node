// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title VOID JobQueue v1
/// @notice Minimal on-chain job registry for off-chain AI/agent work.
/// @dev Fee model, agent registry, and DAGs are intentionally out of scope for v1.
contract JobQueue {
    enum JobStatus {
        None,
        Posted,
        Claimed,
        Completed,
        Cancelled
    }

    struct Job {
        address poster;
        address agent;
        bytes32 app;
        bytes32 payloadHash;
        bytes32 receiptHash;
        uint64 createdAt;
        uint64 updatedAt;
        JobStatus status;
    }

    /// @notice Monotonically increasing job id (1-based).
    uint256 public nextJobId;

    /// @notice Registry of all jobs.
    mapping(uint256 => Job) public jobs;

    event JobPosted(
        uint256 indexed jobId,
        address indexed poster,
        bytes32 indexed app,
        bytes32 payloadHash
    );

    event JobClaimed(
        uint256 indexed jobId,
        address indexed agent
    );

    event JobCompleted(
        uint256 indexed jobId,
        address indexed agent,
        bytes32 receiptHash
    );

    event JobCancelled(
        uint256 indexed jobId,
        address indexed poster
    );

    /// @notice Simple version constant for off-chain infra.
    function VERSION() external pure returns (uint256) {
        return 1;
    }

    /// @notice Post a new job to the queue.
    /// @param app Application tag (e.g. keccak256("VOID_AGENT_CHAT")).
    /// @param payloadHash Hash of the off-chain request payload.
    /// @return jobId The id of the newly created job.
    function postJob(bytes32 app, bytes32 payloadHash)
        external
        returns (uint256 jobId)
    {
        jobId = ++nextJobId;

        Job storage j = jobs[jobId];
        j.poster = msg.sender;
        j.app = app;
        j.payloadHash = payloadHash;
        j.createdAt = uint64(block.number);
        j.updatedAt = uint64(block.number);
        j.status = JobStatus.Posted;

        emit JobPosted(jobId, msg.sender, app, payloadHash);
    }

    /// @notice Claim a posted job to signal that an agent is working on it.
    /// @dev Any address can claim; v2 may restrict this to a registry.
    function claimJob(uint256 jobId) external {
        Job storage j = jobs[jobId];

        require(j.status == JobStatus.Posted, "JobQueue: not claimable");
        require(j.poster != address(0), "JobQueue: unknown job");
        require(j.agent == address(0), "JobQueue: already claimed");

        j.agent = msg.sender;
        j.status = JobStatus.Claimed;
        j.updatedAt = uint64(block.number);

        emit JobClaimed(jobId, msg.sender);
    }

    /// @notice Mark a claimed job as completed with a receipt hash.
    /// @param jobId Id of the job.
    /// @param receiptHash Hash of the off-chain result / receipt.
    function completeJob(uint256 jobId, bytes32 receiptHash) external {
        Job storage j = jobs[jobId];

        require(j.status == JobStatus.Claimed, "JobQueue: not claimed");
        require(j.agent == msg.sender, "JobQueue: not job agent");

        j.receiptHash = receiptHash;
        j.status = JobStatus.Completed;
        j.updatedAt = uint64(block.number);

        emit JobCompleted(jobId, msg.sender, receiptHash);
    }

    /// @notice Cancel a posted job that has not yet been claimed.
    /// @param jobId Id of the job to cancel.
    function cancelJob(uint256 jobId) external {
        Job storage j = jobs[jobId];

        require(j.status == JobStatus.Posted, "JobQueue: not cancellable");
        require(j.poster == msg.sender, "JobQueue: not poster");

        j.status = JobStatus.Cancelled;
        j.updatedAt = uint64(block.number);

        emit JobCancelled(jobId, msg.sender);
    }

    /// @notice Convenience view into the job status.
    function getJobStatus(uint256 jobId) external view returns (JobStatus) {
        return jobs[jobId].status;
    }
}
