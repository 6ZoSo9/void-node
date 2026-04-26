// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/mainnet0/VoidValidatorCandidateRegistry.sol";

contract VoidValidatorCandidateRegistryTest is Test {
    VoidValidatorCandidateRegistry reg;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA201);

    uint256 constant MIN_STAKE = 1000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 2,
            _activationChurnLimit: 1
        });

        vm.deal(alice, 10_000 ether);
        vm.deal(bob, 10_000 ether);
        vm.deal(carol, 10_000 ether);
    }

    function testPublicRegistrationDoesNotActivate() public {
        uint256 activeBefore = reg.activeCount();

        vm.prank(alice);
        reg.registerCandidate{value: MIN_STAKE}(
            alice,
            keccak256("alice-consensus-key"),
            keccak256("alice-metadata")
        );

        assertEq(reg.candidateCount(), 1);
        assertEq(reg.waitingCount(), 0);
        assertEq(reg.activeCount(), activeBefore);

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(alice);
        assertEq(c.owner, alice);
        assertEq(uint256(c.state), uint256(VoidValidatorCandidateRegistry.ValidatorState.Candidate));
    }

    function testOnlyOwnerCanMoveCandidateToWaiting() public {
        vm.prank(alice);
        reg.registerCandidate{value: MIN_STAKE}(
            alice,
            keccak256("alice-consensus-key"),
            keccak256("alice-metadata")
        );

        vm.prank(bob);
        vm.expectRevert(VoidValidatorCandidateRegistry.NotOwner.selector);
        reg.moveToWaiting(alice);

        reg.moveToWaiting(alice);

        assertEq(reg.waitingCount(), 1);
        assertEq(reg.activeCount(), 0);

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(alice);
        assertEq(uint256(c.state), uint256(VoidValidatorCandidateRegistry.ValidatorState.Waiting));
    }

    function testActivationIsChurnLimitedAndCapLimited() public {
        _registerAndWait(alice, "alice");
        _registerAndWait(bob, "bob");
        _registerAndWait(carol, "carol");

        address[] memory one = new address[](1);
        one[0] = alice;
        reg.markActiveBatch(one);

        assertEq(reg.activeCount(), 1);
        assertEq(reg.waitingCount(), 2);

        address[] memory two = new address[](2);
        two[0] = bob;
        two[1] = carol;

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.markActiveBatch(two);

        one[0] = bob;
        reg.markActiveBatch(one);

        assertEq(reg.activeCount(), 2);
        assertEq(reg.waitingCount(), 1);

        one[0] = carol;
        vm.expectRevert(VoidValidatorCandidateRegistry.ActiveCapReached.selector);
        reg.markActiveBatch(one);
    }

    function testStakeMinimumEnforced() public {
        vm.prank(alice);
        vm.expectRevert(VoidValidatorCandidateRegistry.StakeTooLow.selector);
        reg.registerCandidate{value: MIN_STAKE - 1}(
            alice,
            keccak256("alice-consensus-key"),
            keccak256("alice-metadata")
        );
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
