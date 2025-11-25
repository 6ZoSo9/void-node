// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/JobQueue.sol";

contract JobQueueLifecycleTest is Test {
    JobQueue jq;
    address ADMIN = address(0xA11CE);
    address USER = address(0xCAFE);
    address AGENT = address(0xBEEF);

    string constant MODEL_ID = "lifecycle-test-model";

    function setUp() public {
        jq = new JobQueue(ADMIN);
    }

    function _postJob() internal returns (bytes32 jobId, bytes32 payloadHash) {
        bytes32 payload = keccak256("lifecycle-input");
        vm.prank(USER);
        jobId = jq.postJob(MODEL_ID, payload, "lifecycle-app");
        return (jobId, payload);
    }

    function testClaimAndCompleteFlow() public {
        (bytes32 jobId,) = _postJob();

        // claim
        vm.prank(AGENT);
        jq.claimJob(jobId);

        JobQueue.JobStatus st = jq.getJobStatus(jobId);
        assertEq(uint8(st), uint8(JobQueue.JobStatus.Claimed), "should be Claimed");

        // complete
        bytes32 resultHash = keccak256("lifecycle-output");
        vm.prank(AGENT);
        jq.completeJob(jobId, resultHash);

        st = jq.getJobStatus(jobId);
        assertEq(uint8(st), uint8(JobQueue.JobStatus.Completed), "should be Completed");

        JobQueue.Job memory j = jq.getJob(jobId);
        assertEq(j.agent, AGENT, "agent mismatch");
        assertEq(j.resultHash, resultHash, "resultHash mismatch");
        assertGt(j.completedAt, 0, "completedAt must be set");
    }

    function testOnlyAgentCanCompleteOrFail() public {
        (bytes32 jobId,) = _postJob();

        vm.prank(AGENT);
        jq.claimJob(jobId);

        bytes32 resultHash = keccak256("bad-output");

        // non-agent cannot complete
        vm.prank(USER);
        vm.expectRevert(bytes("JobQueue: not agent"));
        jq.completeJob(jobId, resultHash);

        // non-agent cannot fail
        vm.prank(USER);
        vm.expectRevert(bytes("JobQueue: not agent"));
        jq.failJob(jobId, 1);
    }

    function test_FailOpSetsStatusAndErrorCode() public {
        (bytes32 jobId,) = _postJob();

        vm.prank(AGENT);
        jq.claimJob(jobId);

        uint32 code = 42;
        vm.prank(AGENT);
        jq.failJob(jobId, code);

        JobQueue.JobStatus st = jq.getJobStatus(jobId);
        assertEq(uint8(st), uint8(JobQueue.JobStatus.Failed), "should be Failed");

        JobQueue.Job memory j = jq.getJob(jobId);
        assertEq(j.errorCode, code, "errorCode mismatch");
        assertGt(j.completedAt, 0, "completedAt must be set on fail");
    }

    function testCancelByAdminOrPoster() public {
        (bytes32 jobId,) = _postJob();

        // random cannot cancel (message in implementation: "JobQueue: not poster/admin")
        vm.prank(address(0x1234));
        vm.expectRevert(bytes("JobQueue: not poster/admin"));
        jq.cancelJob(jobId, 7);

        // poster can cancel
        vm.prank(USER);
        jq.cancelJob(jobId, 7);

        JobQueue.JobStatus st = jq.getJobStatus(jobId);
        assertEq(uint8(st), uint8(JobQueue.JobStatus.Cancelled), "should be Cancelled");
    }

    function testExpireSetsExpiredStatus() public {
        (bytes32 jobId,) = _postJob();

        // current implementation allows expireJob even from non-admin; we just
        // assert that calling it puts the job into Expired status.
        vm.prank(ADMIN);
        jq.expireJob(jobId, 9);

        JobQueue.JobStatus st = jq.getJobStatus(jobId);
        assertEq(uint8(st), uint8(JobQueue.JobStatus.Expired), "should be Expired");
    }

    function testCannotClaimNonPosted() public {
        (bytes32 jobId,) = _postJob();

        vm.prank(AGENT);
        jq.claimJob(jobId);

        // second claim fails; implementation uses "JobQueue: not claimable"
        vm.prank(AGENT);
        vm.expectRevert(bytes("JobQueue: not claimable"));
        jq.claimJob(jobId);
    }
}
