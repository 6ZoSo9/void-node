// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/mainnet0/VoidValidatorCandidateRegistry.sol";

interface VmKeyReleaseV1 {
    function deal(address account, uint256 newBalance) external;
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function warp(uint256 newTimestamp) external;
}

abstract contract KeyReleaseV1TestBase {
    VmKeyReleaseV1 internal constant vm =
        VmKeyReleaseV1(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 left, uint256 right) internal pure {
        require(left == right, "uint mismatch");
    }

    function assertEq(address left, address right) internal pure {
        require(left == right, "address mismatch");
    }

    function assertEq(bytes32 left, bytes32 right) internal pure {
        require(left == right, "bytes32 mismatch");
    }
}

contract RejectingKeyReleaseWithdrawalRecipientV1 {
    receive() external payable {
        revert("reject withdrawal");
    }
}

contract VoidValidatorCandidateRegistryConsensusKeyReleaseOnUnbondV1Test is
    KeyReleaseV1TestBase
{
    VoidValidatorCandidateRegistry internal reg;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    uint256 internal constant MIN_STAKE = 10_000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 2,
            _activationChurnLimit: 1
        });

        vm.deal(alice, 100_000 ether);
        vm.deal(bob, 100_000 ether);
    }

    function testAdministrativeUnbondReleasesKeyBeforeWithdrawalAndOldWithdrawalCannotDeleteNewClaim()
        public
    {
        bytes32 sharedKey = keccak256("admin-unbond-shared-key");

        _register(alice, sharedKey, "alice-admin");

        reg.markUnbonded(alice);

        assertEq(reg.consensusKeyOwner(sharedKey), address(0));
        assertEq(reg.getCandidate(alice).stakeAmount, MIN_STAKE);
        assertEq(reg.totalStaked(), MIN_STAKE);

        _register(bob, sharedKey, "bob-after-admin-unbond");

        assertEq(reg.consensusKeyOwner(sharedKey), bob);
        assertEq(reg.totalStaked(), MIN_STAKE * 2);

        vm.prank(alice);
        reg.withdrawStake(payable(alice));

        assertEq(reg.consensusKeyOwner(sharedKey), bob);
        assertEq(reg.getCandidate(alice).stakeAmount, 0);
        assertEq(reg.getCandidate(bob).stakeAmount, MIN_STAKE);
        assertEq(reg.totalStaked(), MIN_STAKE);
    }

    function testCandidateExitFinalizationReleasesKeyWithoutWithdrawal()
        public
    {
        bytes32 sharedKey = keccak256("candidate-exit-shared-key");

        _register(alice, sharedKey, "alice-candidate-exit");

        vm.prank(alice);
        reg.requestExit();

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());

        vm.prank(alice);
        reg.finalizeExit();

        assertEq(reg.consensusKeyOwner(sharedKey), address(0));
        assertEq(
            uint256(reg.getCandidate(alice).state),
            uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded)
        );
        assertEq(reg.getCandidate(alice).stakeAmount, MIN_STAKE);
        assertEq(reg.totalStaked(), MIN_STAKE);

        _register(bob, sharedKey, "bob-after-candidate-exit");
        assertEq(reg.consensusKeyOwner(sharedKey), bob);
    }

    function testActiveExitFinalizationReleasesKeyAfterRemovalConfirmation()
        public
    {
        bytes32 sharedKey = keccak256("active-exit-shared-key");

        _register(alice, sharedKey, "alice-active-exit");
        reg.moveToWaiting(alice);

        address[] memory one = new address[](1);
        one[0] = alice;
        reg.markActiveBatch(one);

        vm.prank(alice);
        reg.requestExit();

        reg.confirmActiveSetRemoval(
            alice,
            keccak256("active-set-removal-evidence")
        );

        vm.warp(block.timestamp + reg.UNBONDING_DELAY());

        vm.prank(alice);
        reg.finalizeExit();

        assertEq(reg.consensusKeyOwner(sharedKey), address(0));
        assertEq(reg.pendingActiveExitCount(), 0);
        assertEq(reg.activeCount(), 0);
        assertEq(reg.getCandidate(alice).stakeAmount, MIN_STAKE);
    }

    function testRevertedOldWithdrawalPreservesNewOwnerClaimAndOldStake()
        public
    {
        bytes32 sharedKey = keccak256("failed-withdrawal-shared-key");

        _register(alice, sharedKey, "alice-failed-withdrawal");
        reg.markUnbonded(alice);
        _register(bob, sharedKey, "bob-current-owner");

        RejectingKeyReleaseWithdrawalRecipientV1 rejecting =
            new RejectingKeyReleaseWithdrawalRecipientV1();

        vm.prank(alice);
        vm.expectRevert(
            VoidValidatorCandidateRegistry.StakeTransferFailed.selector
        );
        reg.withdrawStake(payable(address(rejecting)));

        assertEq(reg.consensusKeyOwner(sharedKey), bob);
        assertEq(reg.getCandidate(alice).stakeAmount, MIN_STAKE);
        assertEq(reg.getCandidate(bob).stakeAmount, MIN_STAKE);
        assertEq(reg.totalStaked(), MIN_STAKE * 2);
        assertEq(address(reg).balance, MIN_STAKE * 2);
        assertEq(address(rejecting).balance, 0);
    }

    function _register(
        address candidateOwner,
        bytes32 consensusKeyHash,
        string memory label
    ) private {
        vm.prank(candidateOwner);
        reg.registerCandidate{value: MIN_STAKE}(
            candidateOwner,
            consensusKeyHash,
            keccak256(abi.encodePacked(label, "-metadata"))
        );
    }
}
