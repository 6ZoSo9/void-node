// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/mainnet0/VoidValidatorCandidateRegistry.sol";

interface VmLifecycleV3 {
    function deal(address account, uint256 newBalance) external;
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function warp(uint256 newTimestamp) external;
}

abstract contract LifecycleV3TestBase {
    VmLifecycleV3 internal constant vm =
        VmLifecycleV3(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 left, uint256 right) internal pure {
        require(left == right, "uint mismatch");
    }

    function assertEq(address left, address right) internal pure {
        require(left == right, "address mismatch");
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

contract CrossFunctionReentrantCandidateV3 {
    VoidValidatorCandidateRegistry public immutable registry;
    bool public reentryAttempted;
    bool public reentryBlocked;

    uint256 internal constant MIN_STAKE = 10_000 ether;
    bytes32 internal constant INITIAL_KEY = keccak256("reentrant-initial-key");
    bytes32 internal constant REENTRY_KEY = keccak256("reentrant-new-key");

    constructor(VoidValidatorCandidateRegistry registry_) {
        registry = registry_;
    }

    function registerInitial() external {
        registry.registerCandidate{value: MIN_STAKE}(
            address(this),
            INITIAL_KEY,
            keccak256("reentrant-initial-metadata")
        );
    }

    function withdrawAndAttemptReregister() external {
        registry.withdrawStake(payable(address(this)));
    }

    receive() external payable {
        if (reentryAttempted) return;
        reentryAttempted = true;

        try
            registry.reregisterCandidate{value: MIN_STAKE}(
                address(this),
                REENTRY_KEY,
                keccak256("reentrant-new-metadata")
            )
        {
            reentryBlocked = false;
        } catch (bytes memory reason) {
            reentryBlocked =
                _selector(reason) ==
                VoidValidatorCandidateRegistry.Reentrancy.selector;
        }
    }

    function _selector(
        bytes memory reason
    ) private pure returns (bytes4 selector) {
        if (reason.length < 4) return bytes4(0);
        assembly {
            selector := mload(add(reason, 0x20))
        }
    }
}

contract VoidValidatorCandidateRegistryLifecycleCompletenessV3Test is
    LifecycleV3TestBase
{
    VoidValidatorCandidateRegistry internal reg;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA201);

    uint256 internal constant MIN_STAKE = 10_000 ether;

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

    function testActivationBatchAliasIsHonestAndCompatible() public {
        assertEq(reg.activationChurnLimit(), 1);
        assertEq(reg.maxActivationBatchSize(), 1);
    }

    function testDuplicateConsensusKeyRejectedAndReleasedAfterWithdrawal()
        public
    {
        bytes32 sharedKey = keccak256("shared-consensus-key");
        _register(alice, sharedKey, "alice");

        vm.prank(bob);
        vm.expectRevert(
            VoidValidatorCandidateRegistry
                .ConsensusKeyAlreadyRegistered
                .selector
        );
        reg.registerCandidate{value: MIN_STAKE}(
            bob,
            sharedKey,
            keccak256("bob-metadata")
        );

        assertEq(reg.consensusKeyOwner(sharedKey), alice);

        reg.markUnbonded(alice);
        vm.prank(alice);
        reg.withdrawStake(payable(alice));

        assertEq(reg.consensusKeyOwner(sharedKey), address(0));

        vm.prank(bob);
        reg.registerCandidate{value: MIN_STAKE}(
            bob,
            sharedKey,
            keccak256("bob-metadata")
        );

        assertEq(reg.consensusKeyOwner(sharedKey), bob);
    }

    function testCandidateProfileUpdateRotatesConsensusKey() public {
        bytes32 keyOne = keccak256("alice-key-one");
        bytes32 keyTwo = keccak256("alice-key-two");
        bytes32 keyThree = keccak256("alice-key-three");
        bytes32 metadataTwo = keccak256("alice-metadata-two");

        _register(alice, keyOne, "alice");

        vm.prank(alice);
        reg.updateCandidateProfile(bob, keyTwo, metadataTwo);

        VoidValidatorCandidateRegistry.Candidate memory candidate =
            reg.getCandidate(alice);

        assertEq(candidate.reward, bob);
        assertEq(candidate.consensusKeyHash, keyTwo);
        assertEq(candidate.metadataHash, metadataTwo);
        assertEq(reg.consensusKeyOwner(keyOne), address(0));
        assertEq(reg.consensusKeyOwner(keyTwo), alice);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.NoProfileChange.selector
        );
        reg.updateCandidateProfile(bob, keyTwo, metadataTwo);

        reg.moveToWaiting(alice);

        vm.prank(alice);
        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.updateCandidateProfile(alice, keyThree, metadataTwo);

        vm.prank(alice);
        reg.returnToCandidate();

        assertEq(reg.waitingCount(), 0);

        vm.prank(alice);
        reg.updateCandidateProfile(alice, keyThree, metadataTwo);

        assertEq(reg.consensusKeyOwner(keyTwo), address(0));
        assertEq(reg.consensusKeyOwner(keyThree), alice);
    }

    function testReturnToCandidateRequiresWaitingState() public {
        bytes32 key = keccak256("alice-return-key");
        _register(alice, key, "alice");

        vm.prank(alice);
        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.returnToCandidate();

        reg.moveToWaiting(alice);
        assertEq(reg.waitingCount(), 1);

        vm.prank(alice);
        reg.returnToCandidate();

        assertEq(reg.waitingCount(), 0);
        assertEq(
            uint256(_state(alice)),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Candidate)
        );

        vm.prank(alice);
        vm.expectRevert(VoidValidatorCandidateRegistry.InvalidState.selector);
        reg.returnToCandidate();
    }

    function testReregisterAfterWithdrawalPreservesUniqueOwnerCount() public {
        bytes32 keyOne = keccak256("alice-cycle-one");
        bytes32 keyTwo = keccak256("alice-cycle-two");
        uint256 firstStake = MIN_STAKE + 123 ether;

        vm.prank(alice);
        reg.registerCandidate{value: firstStake}(
            alice,
            keyOne,
            keccak256("alice-cycle-one-metadata")
        );

        reg.markUnbonded(alice);

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.StakeNotWithdrawn.selector
        );
        reg.reregisterCandidate{value: MIN_STAKE}(
            alice,
            keyTwo,
            keccak256("alice-cycle-two-metadata")
        );

        vm.prank(alice);
        reg.withdrawStake(payable(alice));

        assertEq(reg.consensusKeyOwner(keyOne), address(0));
        assertEq(reg.registrationCycle(alice), 1);

        vm.prank(alice);
        reg.reregisterCandidate{value: MIN_STAKE}(
            bob,
            keyTwo,
            keccak256("alice-cycle-two-metadata")
        );

        VoidValidatorCandidateRegistry.Candidate memory candidate =
            reg.getCandidate(alice);

        assertEq(reg.candidateCount(), 1);
        assertEq(reg.uniqueCandidateOwnerCount(), 1);
        assertEq(reg.allCandidateOwnersLength(), 1);
        assertEq(reg.getCandidateOwner(0), alice);
        assertEq(reg.registrationCycle(alice), 2);
        assertEq(reg.totalStaked(), MIN_STAKE);
        assertEq(reg.consensusKeyOwner(keyTwo), alice);
        assertEq(candidate.reward, bob);
        assertEq(candidate.stakeAmount, MIN_STAKE);
        assertEq(
            uint256(candidate.state),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Candidate)
        );
    }

    function testReregisterClearsHistoricalActiveExitFlags() public {
        bytes32 keyOne = keccak256("alice-active-cycle-one");
        bytes32 keyTwo = keccak256("alice-active-cycle-two");

        _registerAndActivate(alice, keyOne, "alice-active");

        vm.prank(alice);
        reg.requestExit();

        bytes32 evidenceHash = keccak256("active-removal-evidence");
        reg.confirmActiveSetRemoval(alice, evidenceHash);

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());
        vm.prank(alice);
        reg.finalizeExit();

        vm.prank(alice);
        reg.withdrawStake(payable(alice));

        vm.prank(alice);
        reg.reregisterCandidate{value: MIN_STAKE}(
            alice,
            keyTwo,
            keccak256("alice-active-cycle-two-metadata")
        );

        assertFalse(reg.activeSetRemovalRequired(alice));
        assertFalse(reg.activeSetRemovalConfirmed(alice));
        assertEq(reg.activeSetRemovalEvidenceHash(alice), bytes32(0));
        assertEq(reg.exitRequestedAt(alice), 0);
        assertEq(reg.pendingActiveExitCount(), 0);
        assertEq(reg.registrationCycle(alice), 2);
    }

    function testProfileUpdateCannotTakeAnotherCandidatesKey() public {
        bytes32 aliceKey = keccak256("alice-owned-key");
        bytes32 bobKey = keccak256("bob-owned-key");

        _register(alice, aliceKey, "alice");
        _register(bob, bobKey, "bob");

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry
                .ConsensusKeyAlreadyRegistered
                .selector
        );
        reg.updateCandidateProfile(
            alice,
            bobKey,
            keccak256("alice-new-metadata")
        );

        assertEq(reg.consensusKeyOwner(aliceKey), alice);
        assertEq(reg.consensusKeyOwner(bobKey), bob);
    }

    function testWithdrawalBlocksCrossFunctionReentry() public {
        CrossFunctionReentrantCandidateV3 attacker =
            new CrossFunctionReentrantCandidateV3(reg);

        vm.deal(address(attacker), MIN_STAKE);
        attacker.registerInitial();
        reg.markUnbonded(address(attacker));

        attacker.withdrawAndAttemptReregister();

        assertTrue(attacker.reentryAttempted());
        assertTrue(attacker.reentryBlocked());
        assertEq(address(attacker).balance, MIN_STAKE);
        assertEq(reg.registrationCycle(address(attacker)), 1);
        assertEq(reg.totalStaked(), 0);
        assertEq(
            uint256(_state(address(attacker))),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded)
        );
    }

    function _state(
        address who
    ) internal view returns (VoidValidatorCandidateRegistry.ValidatorState) {
        return reg.getCandidate(who).state;
    }

    function _register(
        address who,
        bytes32 consensusKey,
        string memory label
    ) internal {
        vm.prank(who);
        reg.registerCandidate{value: MIN_STAKE}(
            who,
            consensusKey,
            keccak256(abi.encodePacked(label, "-metadata"))
        );
    }

    function _registerAndActivate(
        address who,
        bytes32 consensusKey,
        string memory label
    ) internal {
        _register(who, consensusKey, label);
        reg.moveToWaiting(who);

        address[] memory one = new address[](1);
        one[0] = who;
        reg.markActiveBatch(one);
    }
}
