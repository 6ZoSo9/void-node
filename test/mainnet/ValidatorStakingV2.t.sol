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
}
