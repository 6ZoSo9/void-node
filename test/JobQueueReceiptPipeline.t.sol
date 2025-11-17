// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../contracts/JobQueue.sol";
import "../contracts/ReceiptRegistry.sol";

contract JobQueueReceiptPipelineTest is Test {
    JobQueue jobQueue;
    ReceiptRegistry receiptRegistry;

    function setUp() public {
        // For this unit test, make this contract the admin for both.
        jobQueue = new JobQueue(address(this));
        // admin_ = this, jobQueue_ = jobQueue, agentRegistry_ = address(0) (no auth)
        receiptRegistry = new ReceiptRegistry(address(this), address(jobQueue), address(0));
    }

    function testJobAndReceiptPipeline() public {
        // --- 1) Post a job on JobQueue ---
        string memory modelId   = "devnet-model-1";
        string memory appTag    = "devnet-app";
        bytes32 payloadHash     = keccak256("input-payload");

        bytes32 jobId = jobQueue.postJob(
            modelId,
            payloadHash,
            appTag
        );

        // Basic sanity: jobExists must be true now
        bool exists = jobQueue.jobExists(jobId);
        assertTrue(exists, "jobExists(jobId) should be true after postJob");

        // --- 2) Submit a receipt referencing this job on ReceiptRegistry ---
        bytes32 outputHash = keccak256("output-payload");
        bytes32 modelHash  = keccak256("model-manifest");
        uint8   status     = 1; // completed

        ReceiptRegistry.ReceiptInput memory r = ReceiptRegistry.ReceiptInput({
            jobId:      jobId,
            modelId:    modelId,
            inputHash:  payloadHash,
            outputHash: outputHash,
            modelHash:  modelHash,
            status:     status
        });

        // ReceiptRegistry will call jobQueue.jobExists(jobId) internally
        bytes32 receiptId = receiptRegistry.submitReceipt(r);

        // --- 3) Verify it is indexed under that jobId ---
        bytes32[] memory ids = receiptRegistry.getReceiptsForJob(jobId);
        assertEq(ids.length, 1, "expected exactly one receipt for jobId");
        assertEq(ids[0], receiptId, "stored receiptId mismatch");
    }
}
