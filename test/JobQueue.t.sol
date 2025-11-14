// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/JobQueue.sol";

/// @notice Minimal smoke tests for JobQueue.
/// @dev No forge-std, just bare require().
contract JobQueueTest {
    JobQueue private queue;

    constructor() {
        queue = new JobQueue();
    }

    function testPostAndCancelJob() public {
        bytes32 app = keccak256(abi.encodePacked("VOID_AGENT_CHAT"));
        bytes32 payloadHash = keccak256(abi.encodePacked("example-payload"));

        uint256 jobId = queue.postJob(app, payloadHash);

        // Status should be Posted
        JobQueue.JobStatus status = queue.getJobStatus(jobId);
        require(status == JobQueue.JobStatus.Posted, "status != Posted");

        // Inspect stored job via public mapping getter
        (
            address poster,
            address agent,
            bytes32 appOut,
            bytes32 payloadOut,
            bytes32 receiptHash,
            uint64 createdAt,
            uint64 updatedAt,
            JobQueue.JobStatus status2
        ) = queue.jobs(jobId);

        require(poster == address(this), "poster mismatch");
        require(agent == address(0), "agent non-zero");
        require(appOut == app, "app mismatch");
        require(payloadOut == payloadHash, "payload mismatch");
        require(receiptHash == bytes32(0), "receiptHash non-zero");
        require(createdAt == updatedAt, "timestamps mismatch");
        require(status2 == JobQueue.JobStatus.Posted, "status2 != Posted");

        // Poster cancels while still Posted
        queue.cancelJob(jobId);
        JobQueue.JobStatus status3 = queue.getJobStatus(jobId);
        require(status3 == JobQueue.JobStatus.Cancelled, "status != Cancelled");
    }
}
