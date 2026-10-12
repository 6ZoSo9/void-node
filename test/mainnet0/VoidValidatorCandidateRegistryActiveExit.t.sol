// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/mainnet0/VoidValidatorCandidateRegistry.sol";

interface VmActiveExit {
    function deal(address account, uint256 newBalance) external;
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function warp(uint256 newTimestamp) external;
}

abstract contract ActiveExitTestBase {
    VmActiveExit internal constant vm =
        VmActiveExit(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 left, uint256 right) internal pure {
        require(left == right, "uint mismatch");
    }

    function assertEq(bytes32 left, bytes32 right) internal pure {
        require(left == right, "bytes32 mismatch");
    }

    function assertTrue(bool value) internal pure {
        require(value, "expected true");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "expected false");
    }
}

contract VoidValidatorCandidateRegistryActiveExitTest is ActiveExitTestBase {
    VoidValidatorCandidateRegistry internal reg;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    uint256 internal constant MIN_STAKE = 10_000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 1,
            _activationChurnLimit: 1
        });
        vm.deal(alice, 100_000 ether);
        vm.deal(bob, 100_000 ether);
    }

    function testActiveExitRequiresRemovalConfirmation() public {
        _registerAndActivate(alice, "alice");

        vm.prank(alice);
        reg.requestExit();

        assertEq(reg.activeCount(), 0);
        assertEq(reg.pendingActiveExitCount(), 1);
        assertTrue(reg.activeSetRemovalRequired(alice));
        assertFalse(reg.activeSetRemovalConfirmed(alice));

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());
        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.ActiveSetRemovalNotConfirmed.selector
        );
        reg.finalizeExit();

        bytes32 evidenceHash = keccak256("alice-active-set-removal-proof");

        vm.prank(bob);
        vm.expectRevert(VoidValidatorCandidateRegistry.NotOwner.selector);
        reg.confirmActiveSetRemoval(alice, evidenceHash);

        vm.expectRevert(
            VoidValidatorCandidateRegistry.InvalidActiveSetRemovalEvidence.selector
        );
        reg.confirmActiveSetRemoval(alice, bytes32(0));

        reg.confirmActiveSetRemoval(alice, evidenceHash);

        assertEq(reg.pendingActiveExitCount(), 0);
        assertTrue(reg.activeSetRemovalConfirmed(alice));
        assertEq(reg.activeSetRemovalEvidenceHash(alice), evidenceHash);

        vm.expectRevert(
            VoidValidatorCandidateRegistry.ActiveSetRemovalAlreadyConfirmed.selector
        );
        reg.confirmActiveSetRemoval(alice, evidenceHash);

        vm.prank(alice);
        reg.finalizeExit();

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        reg.withdrawStake(payable(alice));

        assertEq(alice.balance - aliceBefore, MIN_STAKE);
        assertEq(reg.totalStaked(), 0);
    }

    function testPendingActiveExitStillConsumesActivationCap() public {
        _registerAndActivate(alice, "alice");
        _registerAndWait(bob, "bob");

        vm.prank(alice);
        reg.requestExit();

        address[] memory one = new address[](1);
        one[0] = bob;
        vm.expectRevert(
            VoidValidatorCandidateRegistry.ActiveCapReached.selector
        );
        reg.markActiveBatch(one);

        reg.confirmActiveSetRemoval(
            alice,
            keccak256("alice-active-set-removal-proof")
        );
        reg.markActiveBatch(one);

        assertEq(reg.pendingActiveExitCount(), 0);
        assertEq(reg.activeCount(), 1);
    }

    function testDirectAdministrativeUnbondOfActiveIsRejected() public {
        _registerAndActivate(alice, "alice");

        vm.expectRevert(
            VoidValidatorCandidateRegistry.ActiveSetRemovalNotConfirmed.selector
        );
        reg.markUnbonded(alice);

        reg.jail(alice);
        assertEq(reg.activeCount(), 0);
        assertTrue(reg.activeSetRemovalRequired(alice));
        assertTrue(reg.activeSetRemovalConfirmed(alice));
        assertTrue(reg.activeSetRemovalEvidenceHash(alice) != bytes32(0));

        reg.markUnbonded(alice);
        vm.prank(alice);
        reg.withdrawStake(payable(alice));
        assertEq(reg.totalStaked(), 0);
    }

    function testJailedActiveParticipantKeepsConfirmedRemovalOnDelayedExit()
        public
    {
        _registerAndActivate(alice, "alice");
        reg.jail(alice);

        vm.prank(alice);
        reg.requestExit();

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());
        vm.prank(alice);
        reg.finalizeExit();

        vm.prank(alice);
        reg.withdrawStake(payable(alice));
        assertEq(reg.totalStaked(), 0);
    }

    function _registerAndActivate(address who, string memory label) internal {
        _registerAndWait(who, label);
        address[] memory one = new address[](1);
        one[0] = who;
        reg.markActiveBatch(one);
    }

    function _registerAndWait(address who, string memory label) internal {
        vm.prank(who);
        reg.registerCandidate{value: MIN_STAKE}(
            who,
            keccak256(abi.encodePacked(label, "-consensus-key")),
            keccak256(abi.encodePacked(label, "-metadata"))
        );
        reg.moveToWaiting(who);
    }
}
