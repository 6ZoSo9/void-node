// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/UpdateGate.sol";

contract UpdateGateTest is Test {
    UpdateGate gate;

    address signer1 = address(0x1001);
    address signer2 = address(0x1002);
    address signer3 = address(0x1003);

    function setUp() public {
        gate = new UpdateGate();

        // msg.sender is this test contract, which is admin
        gate.setSigner(signer1, true);
        gate.setSigner(signer2, true);
        gate.setSigner(signer3, true);
        gate.setThreshold(2);

        assertEq(gate.signerCount(), 3);
        assertEq(gate.signerThreshold(), 2);
    }

    function testProposeApproveExecute() public {
        bytes32 manifestHash = keccak256("VOID-MAINNET-CORE-MANIFEST-v1");
        uint64 activationHeight = uint64(block.number + 5);
        bool emergency = false;

        bytes32 updateId = gate.proposeUpdate(
            manifestHash,
            activationHeight,
            emergency
        );

        // two signers approve
        vm.prank(signer1);
        gate.approveUpdate(updateId);

        vm.prank(signer2);
        gate.approveUpdate(updateId);

        // can't re-approve from same signer
        vm.prank(signer2);
        vm.expectRevert(bytes("UpdateGate: already approved"));
        gate.approveUpdate(updateId);

        // can't execute before activation height
        vm.expectRevert(bytes("UpdateGate: not at activation height"));
        gate.executeUpdate(updateId);

        // fast-forward to >= activationHeight
        vm.roll(activationHeight + 1);

        gate.executeUpdate(updateId);

        (
            bytes32 mHash,
            uint64 actHeight,
            bool emergencyFlag,
            bool executed,
            uint256 approvals,
            /*createdAt*/
        ) = gate.getUpdate(updateId);

        assertEq(mHash, manifestHash);
        assertEq(actHeight, activationHeight);
        assertEq(emergencyFlag, false);
        assertTrue(executed);
        assertEq(approvals, 2);

        assertEq(gate.currentUpdateId(), updateId);
        assertEq(gate.currentManifestHash(), manifestHash);
    }

    function testEmergencyUpdateSkipsHeightCheck() public {
        bytes32 manifestHash = keccak256("VOID-MAINNET-CORE-EMERGENCY");
        uint64 activationHeight = 0;
        bool emergency = true;

        bytes32 updateId = gate.proposeUpdate(
            manifestHash,
            activationHeight,
            emergency
        );

        vm.prank(signer1);
        gate.approveUpdate(updateId);
        vm.prank(signer2);
        gate.approveUpdate(updateId);

        // no height requirement when emergency=true
        gate.executeUpdate(updateId);

        assertEq(gate.currentUpdateId(), updateId);
        assertEq(gate.currentManifestHash(), manifestHash);
    }
}
