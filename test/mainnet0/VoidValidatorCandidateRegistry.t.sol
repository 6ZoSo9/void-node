// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/mainnet0/VoidValidatorCandidateRegistry.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function warp(uint256 newTimestamp) external;
}

abstract contract TestBase {
    Vm internal constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 left, uint256 right) internal pure {
        require(left == right, "uint mismatch");
    }

    function assertEq(address left, address right) internal pure {
        require(left == right, "address mismatch");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "expected false");
    }
}

contract RejectingStakeRecipient {
    receive() external payable {
        revert("reject stake");
    }
}

contract ReentrantStakeOwner {
    VoidValidatorCandidateRegistry public immutable registry;
    bool public reentrySucceeded;

    constructor(VoidValidatorCandidateRegistry registry_) {
        registry = registry_;
    }

    function register() external payable {
        registry.registerCandidate{value: msg.value}(
            address(this),
            keccak256("reentrant-consensus-key"),
            keccak256("reentrant-metadata")
        );
    }

    function withdraw() external {
        registry.withdrawStake(payable(address(this)));
    }

    receive() external payable {
        (bool ok, ) = address(registry).call(
            abi.encodeWithSelector(
                registry.withdrawStake.selector,
                payable(address(this))
            )
        );
        reentrySucceeded = ok;
    }
}

contract VoidValidatorCandidateRegistryTest is TestBase {
    VoidValidatorCandidateRegistry reg;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA201);
    address recipient = address(0xBEEF);

    uint256 constant MIN_STAKE = 10_000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 2,
            _activationChurnLimit: 1
        });

        vm.deal(alice, 100_000 ether);
        vm.deal(bob, 100_000 ether);
        vm.deal(carol, 100_000 ether);
    }

    function testConstructorRejectsUnsafePolicy() public {
        vm.expectRevert(
            VoidValidatorCandidateRegistry.InvalidMinimumStake.selector
        );
        new VoidValidatorCandidateRegistry(0, 2, 1);

        vm.expectRevert(
            VoidValidatorCandidateRegistry.InvalidActiveCap.selector
        );
        new VoidValidatorCandidateRegistry(MIN_STAKE, 0, 1);

        vm.expectRevert(
            VoidValidatorCandidateRegistry.InvalidChurnLimit.selector
        );
        new VoidValidatorCandidateRegistry(MIN_STAKE, 2, 0);

        vm.expectRevert(
            VoidValidatorCandidateRegistry.InvalidChurnLimit.selector
        );
        new VoidValidatorCandidateRegistry(MIN_STAKE, 2, 3);
    }

    function testPublicRegistrationDoesNotActivateAndTracksAllStake() public {
        uint256 deposited = MIN_STAKE + 777 ether;
        _register(alice, "alice", deposited);

        assertEq(reg.candidateCount(), 1);
        assertEq(reg.waitingCount(), 0);
        assertEq(reg.activeCount(), 0);
        assertEq(reg.totalStaked(), deposited);
        assertEq(address(reg).balance, deposited);

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(
            alice
        );
        assertEq(c.owner, alice);
        assertEq(c.stakeAmount, deposited);
        assertEq(
            uint256(c.state),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Candidate)
        );
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

    function testOnlyOwnerCanMoveCandidateToWaiting() public {
        _register(alice, "alice", MIN_STAKE);

        vm.prank(bob);
        vm.expectRevert(VoidValidatorCandidateRegistry.NotOwner.selector);
        reg.moveToWaiting(alice);

        reg.moveToWaiting(alice);

        assertEq(reg.waitingCount(), 1);
        assertEq(reg.activeCount(), 0);
        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Waiting)
        );
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
        vm.expectRevert(
            VoidValidatorCandidateRegistry.ActiveCapReached.selector
        );
        reg.markActiveBatch(one);
    }

    function testParticipantExitReturnsCompleteAdditionalStake() public {
        uint256 deposited = MIN_STAKE + 2_345 ether;
        _register(alice, "alice", deposited);

        vm.prank(alice);
        reg.requestExit();

        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Exiting)
        );
        assertEq(reg.exitRequestedAt(alice), block.timestamp);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.UnbondingNotReady.selector
        );
        reg.finalizeExit();

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());
        vm.prank(alice);
        reg.finalizeExit();

        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded)
        );

        uint256 recipientBefore = recipient.balance;
        vm.prank(alice);
        reg.withdrawStake(payable(recipient));

        assertEq(recipient.balance - recipientBefore, deposited);
        assertEq(reg.totalStaked(), 0);
        assertEq(address(reg).balance, 0);

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(
            alice
        );
        assertEq(c.stakeAmount, 0);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.NoStakeAvailable.selector
        );
        reg.withdrawStake(payable(recipient));
    }

    function testWaitingAndActiveExitMaintainCounters() public {
        _registerAndWait(alice, "alice");
        _registerAndWait(bob, "bob");

        address[] memory one = new address[](1);
        one[0] = alice;
        reg.markActiveBatch(one);

        assertEq(reg.waitingCount(), 1);
        assertEq(reg.activeCount(), 1);

        vm.prank(alice);
        reg.requestExit();
        assertEq(reg.waitingCount(), 1);
        assertEq(reg.activeCount(), 0);
        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Exiting)
        );

        vm.prank(bob);
        reg.requestExit();
        assertEq(reg.waitingCount(), 0);
        assertEq(reg.activeCount(), 0);
        assertEq(
            uint256(_state(bob)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Exiting)
        );
    }

    function testJailedParticipantCanExitWithoutOwnerCooperation() public {
        _registerAndWait(alice, "alice");
        reg.jail(alice);

        assertEq(reg.waitingCount(), 0);
        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Jailed)
        );

        vm.prank(alice);
        reg.requestExit();

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());
        vm.prank(alice);
        reg.finalizeExit();

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        reg.withdrawStake(payable(alice));

        assertEq(alice.balance - aliceBefore, MIN_STAKE);
        assertEq(reg.totalStaked(), 0);
    }

    function testOwnerForceUnbondIsConstrainedAndStakeRemainsParticipantOwned()
        public
    {
        _register(alice, "alice", MIN_STAKE);
        reg.markUnbonded(alice);

        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded)
        );
        assertEq(reg.totalStaked(), MIN_STAKE);

        vm.prank(bob);
        vm.expectRevert(VoidValidatorCandidateRegistry.NotRegistered.selector);
        reg.withdrawStake(payable(bob));

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        reg.withdrawStake(payable(alice));
        assertEq(alice.balance - aliceBefore, MIN_STAKE);

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.markUnbonded(alice);
    }

    function testOwnerCannotBypassStartedParticipantExitDelay() public {
        _register(alice, "alice", MIN_STAKE);

        vm.prank(alice);
        reg.requestExit();

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.markUnbonded(alice);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.UnbondingNotReady.selector
        );
        reg.finalizeExit();
    }

    function testFailedRecipientTransferPreservesStakeAccounting() public {
        RejectingStakeRecipient rejecting = new RejectingStakeRecipient();
        _register(alice, "alice", MIN_STAKE);
        reg.markUnbonded(alice);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.StakeTransferFailed.selector
        );
        reg.withdrawStake(payable(address(rejecting)));

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(
            alice
        );
        assertEq(c.stakeAmount, MIN_STAKE);
        assertEq(reg.totalStaked(), MIN_STAKE);
        assertEq(address(reg).balance, MIN_STAKE);
    }

    function testWithdrawalRejectsZeroRecipient() public {
        _register(alice, "alice", MIN_STAKE);
        reg.markUnbonded(alice);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.InvalidRecipient.selector
        );
        reg.withdrawStake(payable(address(0)));
    }

    function testWithdrawalReentrancyIsBlocked() public {
        ReentrantStakeOwner attacker = new ReentrantStakeOwner(reg);

        attacker.register{value: MIN_STAKE}();
        reg.markUnbonded(address(attacker));
        attacker.withdraw();

        assertFalse(attacker.reentrySucceeded());
        assertEq(address(attacker).balance, MIN_STAKE);

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(
            address(attacker)
        );
        assertEq(c.stakeAmount, 0);
        assertEq(reg.totalStaked(), 0);
    }

    function testInvalidStateTransitionsAreRejected() public {
        _registerAndWait(alice, "alice");

        vm.prank(alice);
        reg.requestExit();

        vm.prank(alice);
        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.requestExit();

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.jail(alice);

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.moveToWaiting(alice);

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.markUnbonded(alice);

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());
        vm.prank(alice);
        reg.finalizeExit();

        vm.prank(alice);
        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.requestExit();

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.jail(alice);
    }

    function testOwnershipTransferIsTwoStepAndCancelable() public {
        _register(alice, "alice", MIN_STAKE);

        reg.transferOwnership(bob);
        assertEq(reg.owner(), address(this));
        assertEq(reg.pendingOwner(), bob);

        vm.expectRevert(
            VoidValidatorCandidateRegistry.OwnershipTransferPending.selector
        );
        reg.transferOwnership(carol);

        vm.prank(carol);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.NotPendingOwner.selector
        );
        reg.acceptOwnership();

        reg.cancelOwnershipTransfer();
        assertEq(reg.pendingOwner(), address(0));

        reg.transferOwnership(bob);
        vm.prank(bob);
        reg.acceptOwnership();

        assertEq(reg.owner(), bob);
        assertEq(reg.pendingOwner(), address(0));

        vm.expectRevert(VoidValidatorCandidateRegistry.NotOwner.selector);
        reg.moveToWaiting(alice);

        vm.prank(bob);
        reg.moveToWaiting(alice);
        assertEq(reg.waitingCount(), 1);
    }

    function testOwnershipTransferRejectsInvalidTargets() public {
        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidOwner.selector);
        reg.transferOwnership(address(0));

        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidOwner.selector);
        reg.transferOwnership(address(this));

        vm.expectRevert(
            VoidValidatorCandidateRegistry.NoOwnershipTransferPending.selector
        );
        reg.cancelOwnershipTransfer();
    }

    function testJailAndAdministrativeUnbondCountersRemainExact() public {
        _registerAndWait(alice, "alice");
        _registerAndWait(bob, "bob");

        address[] memory one = new address[](1);
        one[0] = alice;
        reg.markActiveBatch(one);

        reg.jail(alice);
        assertEq(reg.activeCount(), 0);
        assertEq(reg.waitingCount(), 1);
        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Jailed)
        );

        reg.markUnbonded(alice);
        assertEq(reg.activeCount(), 0);
        assertEq(reg.waitingCount(), 1);
        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded)
        );

        reg.markUnbonded(bob);
        assertEq(reg.activeCount(), 0);
        assertEq(reg.waitingCount(), 0);
        assertEq(
            uint256(_state(bob)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded)
        );
    }

    function _register(
        address who,
        string memory label,
        uint256 stake
    ) internal {
        vm.prank(who);
        reg.registerCandidate{value: stake}(
            who,
            keccak256(abi.encodePacked(label, "-consensus-key")),
            keccak256(abi.encodePacked(label, "-metadata"))
        );
    }

    function _registerAndWait(address who, string memory label) internal {
        _register(who, label, MIN_STAKE);
        reg.moveToWaiting(who);
    }

    function _state(
        address who
    ) internal view returns (VoidValidatorCandidateRegistry.ValidatorState) {
        return reg.getCandidate(who).state;
    }
}
