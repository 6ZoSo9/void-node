// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/JobQueue.sol";

contract JobQueueViewsTest is Test {
    JobQueue jq;
    address ADMIN = address(0xA11CE);
    address USER  = address(0xCAFE);

    function setUp() public {
        jq = new JobQueue(ADMIN);
    }

    function testGetJobAndStatus() public {
        string memory modelId   = "view-test-model";
        string memory appTag    = "view-test-app";
        bytes32 payloadHash     = keccak256("view-test-input");

        vm.prank(USER);
        bytes32 jobId = jq.postJob(
            modelId,
            payloadHash,
            appTag
        );

        // status via helper
        JobQueue.JobStatus st = jq.getJobStatus(jobId);
        assertEq(uint8(st), uint8(JobQueue.JobStatus.Posted), "status should be Posted");

        // full job view
        JobQueue.Job memory j = jq.getJob(jobId);
        assertEq(j.jobId, jobId, "jobId mismatch");
        assertEq(j.chainId, block.chainid, "chainId mismatch");
        assertEq(j.postedBy, USER, "postedBy mismatch");
        assertEq(j.payloadHash, payloadHash, "payloadHash mismatch");
        assertEq(uint8(j.status), uint8(JobQueue.JobStatus.Posted), "stored status mismatch");
    }

    function testGetJobRevertsForUnknown() public {
        bytes32 fakeId = bytes32(uint256(123));
        vm.expectRevert(bytes("JobQueue: unknown job"));
        jq.getJob(fakeId);
    }
}
