// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/JobQueue.sol";
import "../contracts/ReceiptRegistry.sol";
import "../contracts/AgentRegistry.sol";

contract ReceiptRegistryAgentAuthTest is Test {
    JobQueue jobQueue;
    ReceiptRegistry receiptRegistry;
    AgentRegistry agentRegistry;

    address ADMIN = address(0xA11CE);
    address USER  = address(0xCAFE);
    address AGENT = address(0xBEEF);

    string constant MODEL_ID = "void-devnet-model-1";

    function setUp() public {
        jobQueue = new JobQueue(ADMIN);
        agentRegistry = new AgentRegistry(ADMIN);
        receiptRegistry = new ReceiptRegistry(
            ADMIN,
            address(jobQueue),
            address(agentRegistry)
        );
    }

    function _postJob() internal returns (bytes32 jobId, bytes32 payloadHash) {
        bytes32 payload = keccak256("agent-auth-test-input");
        vm.prank(USER);
        jobId = jobQueue.postJob(
            MODEL_ID,
            payload,
            "auth-test-app"
        );
        payloadHash = payload;
    }

    function _makeReceiptInput(bytes32 jobId, bytes32 inputHash) internal pure returns (ReceiptRegistry.ReceiptInput memory) {
        bytes32 outputHash = keccak256("agent-auth-test-output");
        bytes32 modelHash  = keccak256("agent-auth-test-model");
        uint8 status       = 1; // completed

        return ReceiptRegistry.ReceiptInput({
            jobId:      jobId,
            modelId:    MODEL_ID,
            inputHash:  inputHash,
            outputHash: outputHash,
            modelHash:  modelHash,
            status:     status
        });
    }

    function testNonexistentJobReverts() public {
        // Random jobId that was never posted
        bytes32 fakeJobId = bytes32(uint256(123));
        ReceiptRegistry.ReceiptInput memory r = _makeReceiptInput(fakeJobId, keccak256("x"));

        vm.prank(AGENT);
        vm.expectRevert(bytes("ReceiptRegistry: job does not exist"));
        receiptRegistry.submitReceipt(r);
    }

    function testUnauthorizedAgentCannotSubmit() public {
        (bytes32 jobId, bytes32 payloadHash) = _postJob();
        ReceiptRegistry.ReceiptInput memory r = _makeReceiptInput(jobId, payloadHash);

        // No auth configured for AGENT yet → should revert
        vm.prank(AGENT);
        vm.expectRevert(bytes("ReceiptRegistry: agent not authorized"));
        receiptRegistry.submitReceipt(r);
    }

    function testAuthorizedAgentCanSubmit() public {
        (bytes32 jobId, bytes32 payloadHash) = _postJob();
        ReceiptRegistry.ReceiptInput memory r = _makeReceiptInput(jobId, payloadHash);

        // Grant per-model auth to AGENT
        vm.prank(ADMIN);
        agentRegistry.setAgentModel(AGENT, MODEL_ID, true);

        // Now submission should succeed
        vm.prank(AGENT);
        bytes32 receiptId = receiptRegistry.submitReceipt(r);

        // Verify it is indexed under the jobId
        bytes32[] memory ids = receiptRegistry.getReceiptsForJob(jobId);
        assertEq(ids.length, 1, "expected exactly one receipt");
        assertEq(ids[0], receiptId, "stored receiptId mismatch");
        assertEq(receiptRegistry.totalReceipts(), 1, "totalReceipts should be 1");
    }
}
