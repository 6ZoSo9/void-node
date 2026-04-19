// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/ValidatorEpochRuntimeConsumer.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenEpochConsumer {
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

contract ValidatorEpochRuntimeConsumerTest is Test {
    MockVoidTokenEpochConsumer internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;
    ValidatorSelectionOrderedView internal ordered;
    ValidatorEpochSnapshot internal snapshot;
    ValidatorEpochRuntimeConsumer internal consumer;

    address internal admin = address(0xAD01);

    address internal controller1 = address(0xA101);
    address internal controller2 = address(0xA102);
    address internal controller3 = address(0xA103);

    address internal reward1 = address(0xB101);
    address internal reward2 = address(0xB102);
    address internal reward3 = address(0xB103);

    bytes32 internal key1 = bytes32(uint256(101));
    bytes32 internal key2 = bytes32(uint256(102));
    bytes32 internal key3 = bytes32(uint256(103));

    uint256 internal constant MIN_STAKE = 1000 ether;
    uint256 internal constant UNBOND = 7 days;

    function setUp() public {
        token = new MockVoidTokenEpochConsumer();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ordered = new ValidatorSelectionOrderedView(address(registry));
        snapshot = new ValidatorEpochSnapshot(admin, address(ordered));
        consumer = new ValidatorEpochRuntimeConsumer(address(snapshot));

        token.mint(controller1, 5000 ether);
        token.mint(controller2, 5000 ether);
        token.mint(controller3, 5000 ether);

        vm.startPrank(controller1);
        token.approve(address(staking), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(controller2);
        token.approve(address(staking), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(controller3);
        token.approve(address(staking), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(controller1);
        staking.registerAndStake(reward1, key1, 1000 ether);
        staking.activate();
        vm.stopPrank();

        vm.startPrank(controller2);
        staking.registerAndStake(reward2, key2, 2000 ether);
        staking.activate();
        vm.stopPrank();

        vm.startPrank(controller3);
        staking.registerAndStake(reward3, key3, 1500 ether);
        staking.activate();
        vm.stopPrank();
    }

    function test_epochConsumer_readsEpoch1AndEpoch2Independently() public {
        vm.prank(admin);
        snapshot.captureEpoch(1);

        vm.startPrank(controller2);
        staking.beginExit();
        vm.stopPrank();

        vm.prank(admin);
        snapshot.captureEpoch(2);

        assertEq(consumer.validatorCount(1), 3);
        assertEq(consumer.totalPower(1), 4500 ether);

        assertEq(consumer.validatorCount(2), 2);
        assertEq(consumer.totalPower(2), 2500 ether);

        IValidatorSelectionSource.SelectableValidator memory e10 = consumer.validatorAt(1, 0);
        IValidatorSelectionSource.SelectableValidator memory e11 = consumer.validatorAt(1, 1);
        IValidatorSelectionSource.SelectableValidator memory e12 = consumer.validatorAt(1, 2);

        assertEq(e10.reward, reward2);
        assertEq(e10.effectivePower, 2000 ether);
        assertEq(e11.reward, reward3);
        assertEq(e11.effectivePower, 1500 ether);
        assertEq(e12.reward, reward1);
        assertEq(e12.effectivePower, 1000 ether);

        IValidatorSelectionSource.SelectableValidator memory e20 = consumer.validatorAt(2, 0);
        IValidatorSelectionSource.SelectableValidator memory e21 = consumer.validatorAt(2, 1);

        assertEq(e20.reward, reward3);
        assertEq(e20.effectivePower, 1500 ether);
        assertEq(e21.reward, reward1);
        assertEq(e21.effectivePower, 1000 ether);

        (uint256 count1, uint256 total1, IValidatorSelectionSource.SelectableValidator memory snap1) = consumer.runtimeSnapshot(1, 0);
        assertEq(count1, 3);
        assertEq(total1, 4500 ether);
        assertEq(snap1.reward, reward2);
        assertEq(snap1.effectivePower, 2000 ether);

        (uint256 count2, uint256 total2, IValidatorSelectionSource.SelectableValidator memory snap2) = consumer.runtimeSnapshot(2, 0);
        assertEq(count2, 2);
        assertEq(total2, 2500 ether);
        assertEq(snap2.reward, reward3);
        assertEq(snap2.effectivePower, 1500 ether);
    }

    function test_constructor_zeroAddress_reverts() public {
        vm.expectRevert(ValidatorEpochRuntimeConsumer.ZeroAddress.selector);
        new ValidatorEpochRuntimeConsumer(address(0));
    }
}
