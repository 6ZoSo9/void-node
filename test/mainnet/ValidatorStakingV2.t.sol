// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";

contract MockVoidToken {
    string public name = "Mock VOID";
    string public symbol = "MVOID";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external returns (bool) {
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient_balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient_allowance");
        require(balanceOf[from] >= amount, "insufficient_balance");
        unchecked {
            allowance[from][msg.sender] = allowed - amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }
}

contract ValidatorStakingV2Test is Test {
    MockVoidToken internal token;
    ValidatorStakingV2 internal staking;

    address internal controller = address(0xA11CE);
    address internal reward = address(0xBEEF);
    bytes32 internal consensusKey = bytes32(uint256(123456789));
    uint256 internal constant MIN_STAKE = 1000 ether;
    uint256 internal constant UNBOND = 7 days;

    function setUp() public {
        token = new MockVoidToken();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);

        token.mint(controller, 5000 ether);

        vm.startPrank(controller);
        token.approve(address(staking), type(uint256).max);
        vm.stopPrank();
    }

    function test_registerAndStake_setsPendingActivationAtMinStake() public {
        vm.prank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(reward);
        assertEq(info.reward, reward);
        assertEq(info.controller, controller);
        assertEq(info.consensusKey, consensusKey);
        assertEq(info.stakeVOID, MIN_STAKE);
        assertEq(info.active, false);
        assertEq(info.pendingActivation, true);
        assertEq(staking.stakeOf(reward), MIN_STAKE);
        assertEq(token.balanceOf(address(staking)), MIN_STAKE);
    }

    function test_activate_marksValidatorActive() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);
        staking.activate();
        vm.stopPrank();

        assertTrue(staking.isActiveValidator(reward));

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(reward);
        assertEq(info.active, true);

        (address[] memory rewards, uint256[] memory stakeVOID) = staking.getActiveValidators();
        assertEq(rewards.length, 1);
        assertEq(stakeVOID.length, 1);
        assertEq(rewards[0], reward);
        assertEq(stakeVOID[0], MIN_STAKE);
    }

    function test_beginExit_thenFinalizeExit_returnsStake() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);
        staking.activate();
        staking.beginExit();

        IValidatorStakingV2.ValidatorInfo memory mid = staking.getValidator(reward);
        assertEq(mid.active, false);
        assertEq(mid.pendingExit, true);
        assertEq(mid.unbondAmount, MIN_STAKE);
        assertEq(mid.stakeVOID, 0);

        vm.warp(block.timestamp + UNBOND + 1);
        staking.finalizeExit();
        vm.stopPrank();

        IValidatorStakingV2.ValidatorInfo memory end = staking.getValidator(reward);
        assertEq(end.pendingExit, false);
        assertEq(end.unbondAmount, 0);
        assertEq(end.unbondReadyAt, 0);
        assertEq(token.balanceOf(controller), 5000 ether);
        assertEq(token.balanceOf(address(staking)), 0);
    }

    function test_setConsensusKey_updatesKey() public {
        vm.startPrank(controller);
        staking.registerValidator(reward, consensusKey);
        staking.setConsensusKey(bytes32(uint256(999)));
        vm.stopPrank();

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(reward);
        assertEq(info.consensusKey, bytes32(uint256(999)));
    }

    function test_onlyControllerCanMutateValidator() public {
        vm.prank(controller);
        staking.registerValidator(reward, consensusKey);

        vm.expectRevert(ValidatorStakingV2.NotValidatorController.selector);
        staking.activate();

        vm.expectRevert(ValidatorStakingV2.NotValidatorController.selector);
        staking.setConsensusKey(bytes32(uint256(111)));
    }

    function test_activate_revertsBelowMinimumStake() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE - 1);
        vm.expectRevert(ValidatorStakingV2.MinStakeNotMet.selector);
        staking.activate();
        vm.stopPrank();
    }

    function test_cannotRegisterSameRewardTwice() public {
        vm.prank(controller);
        staking.registerValidator(reward, consensusKey);

        vm.expectRevert(ValidatorStakingV2.ValidatorAlreadyRegistered.selector);
        vm.prank(address(0xCAFE));
        staking.registerValidator(reward, bytes32(uint256(2)));
    }

    function test_controllerCannotRegisterSecondValidator() public {
        vm.startPrank(controller);
        staking.registerValidator(reward, consensusKey);
        vm.expectRevert(ValidatorStakingV2.ControllerAlreadyAssigned.selector);
        staking.registerValidator(address(0xB0B), bytes32(uint256(2)));
        vm.stopPrank();
    }

    function test_stakeFor_allowsThirdPartyFunding() public {
        address donor = address(0xD00D);
        token.mint(donor, 2000 ether);

        vm.prank(controller);
        staking.registerValidator(reward, consensusKey);

        vm.startPrank(donor);
        token.approve(address(staking), type(uint256).max);
        staking.stakeFor(reward, MIN_STAKE);
        vm.stopPrank();

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(reward);
        assertEq(info.stakeVOID, MIN_STAKE);
        assertEq(info.pendingActivation, true);
    }

    function test_beginUnbond_belowMinimum_deactivatesValidator() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE + 100 ether);
        staking.activate();
        staking.beginUnbond(101 ether);
        vm.stopPrank();

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(reward);
        assertEq(info.active, false);
        assertEq(info.pendingActivation, false);
        assertEq(info.stakeVOID, MIN_STAKE - 1 ether);

        (address[] memory rewards, ) = staking.getActiveValidators();
        assertEq(rewards.length, 0);
    }

    function test_finalizeUnbond_tooEarly_reverts() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);
        staking.beginExit();
        vm.expectRevert(ValidatorStakingV2.UnbondNotReady.selector);
        staking.finalizeExit();
        vm.stopPrank();
    }

    function test_setRewardAddress_movesValidatorMapping() public {
        address newReward = address(0xABCD);

        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);
        staking.activate();
        staking.setRewardAddress(newReward);
        vm.stopPrank();

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(newReward);
        assertEq(info.reward, newReward);
        assertEq(info.controller, controller);
        assertEq(info.consensusKey, consensusKey);
        assertEq(info.stakeVOID, MIN_STAKE);
        assertTrue(staking.isActiveValidator(newReward));

        vm.expectRevert(ValidatorStakingV2.ValidatorNotFound.selector);
        staking.getValidator(reward);

        (address[] memory rewards, uint256[] memory stakes) = staking.getActiveValidators();
        assertEq(rewards.length, 1);
        assertEq(rewards[0], newReward);
        assertEq(stakes[0], MIN_STAKE);
    }

    function test_beginUnbond_twice_reverts() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);
        staking.beginExit();
        vm.expectRevert(ValidatorStakingV2.PendingUnbondExists.selector);
        staking.beginExit();
        vm.stopPrank();
    }

    function test_getValidatorCount_tracksRegistrations() public {
        vm.prank(controller);
        staking.registerValidator(reward, consensusKey);

        vm.prank(address(0xCAFE));
        staking.registerValidator(address(0xD00D), bytes32(uint256(88)));

        assertEq(staking.getValidatorCount(), 2);
    }
}
