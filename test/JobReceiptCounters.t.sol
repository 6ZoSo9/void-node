// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../contracts/JobQueue.sol";
import "../contracts/ReceiptRegistry.sol";

contract JobReceiptCountersTest is Test {
    JobQueue jobQueue;
    ReceiptRegistry receiptRegistry;

    function setUp() public {
        jobQueue = new JobQueue(address(this));
        receiptRegistry = new ReceiptRegistry(address(this), address(jobQueue), address(0));
    }

    function testCountersIncrement() public {
        // initial state
        assertEq(jobQueue.totalJobs(), 0, "totalJobs should start at 0");
        assertEq(receiptRegistry.totalReceipts(), 0, "totalReceipts should start at 0");

        // post job
        string memory modelId   = "devnet-model-1";
        string memory appTag    = "devnet-app";
        bytes32 payloadHash     = keccak256("input-payload");

        bytes32 jobId = jobQueue.postJob(
            modelId,
            payloadHash,
            appTag
        );

        // totalJobs should be 1 now
        assertEq(jobQueue.totalJobs(), 1, "totalJobs should be 1 after first postJob");
        assertTrue(jobQueue.jobExists(jobId), "jobExists(jobId) must be true");

        // submit receipt
        bytes32 outputHash = keccak256("output-payload");
        bytes32 modelHash  = keccak256("model-manifest");
        uint8   status     = 1;

        ReceiptRegistry.ReceiptInput memory r = ReceiptRegistry.ReceiptInput({
            jobId:      jobId,
            modelId:    modelId,
            inputHash:  payloadHash,
            outputHash: outputHash,
            modelHash:  modelHash,
            status:     status
        });

        receiptRegistry.submitReceipt(r);

        // totalReceipts should be 1 now
        assertEq(receiptRegistry.totalReceipts(), 1, "totalReceipts should be 1 after first submitReceipt");
    }
}
