// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/ValidatorEpochProposerSelector.sol";
import "../../contracts/mainnet/ValidatorEpochScheduleView.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenEpochSchedule {
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

contract ValidatorEpochScheduleViewTest is Test {
    MockVoidTokenEpochSchedule internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;
    ValidatorSelectionOrderedView internal ordered;
    ValidatorEpochSnapshot internal snapshot;
    ValidatorEpochProposerSelector internal selector;
    ValidatorEpochScheduleView internal scheduleView;

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
        token = new MockVoidTokenEpochSchedule();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ordered = new ValidatorSelectionOrderedView(address(registry));
        snapshot = new ValidatorEpochSnapshot(admin, address(ordered));
        selector = new ValidatorEpochProposerSelector(address(snapshot));
        scheduleView = new ValidatorEpochScheduleView(address(selector));

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

        vm.prank(admin);
        snapshot.captureEpoch(1);

        vm.startPrank(controller2);
        staking.beginExit();
        vm.stopPrank();

        vm.prank(admin);
        snapshot.captureEpoch(2);
    }

    function test_scheduleWindowMatchesSelector_epoch1() public view {
        ValidatorEpochScheduleView.SlotProposer[] memory s = scheduleView.proposerSchedule(1, 0, 8);
        assertEq(s.length, 8);

        for (uint256 i = 0; i < s.length; i++) {
            IValidatorSelectionSource.SelectableValidator memory v = selector.proposerForSlot(1, i);
            assertEq(s[i].slot, i);
            assertEq(s[i].reward, v.reward);
            assertEq(s[i].effectivePower, v.effectivePower);
        }
    }

    function test_scheduleWindowMatchesSelector_epoch2() public view {
        ValidatorEpochScheduleView.SlotProposer[] memory s = scheduleView.proposerSchedule(2, 0, 8);
        assertEq(s.length, 8);

        for (uint256 i = 0; i < s.length; i++) {
            IValidatorSelectionSource.SelectableValidator memory v = selector.proposerForSlot(2, i);
            assertEq(s[i].slot, i);
            assertEq(s[i].reward, v.reward);
            assertEq(s[i].effectivePower, v.effectivePower);
        }
    }

    function test_scheduleWindowCanDifferAcrossEpochs() public view {
        ValidatorEpochScheduleView.SlotProposer[] memory s1 = scheduleView.proposerSchedule(1, 0, 16);
        ValidatorEpochScheduleView.SlotProposer[] memory s2 = scheduleView.proposerSchedule(2, 0, 16);

        bool foundDiff = false;
        for (uint256 i = 0; i < s1.length; i++) {
            if (s1[i].reward != s2[i].reward || s1[i].effectivePower != s2[i].effectivePower) {
                foundDiff = true;
                break;
            }
        }
        assertTrue(foundDiff);
    }

    function test_zeroLengthWindow() public view {
        ValidatorEpochScheduleView.SlotProposer[] memory s = scheduleView.proposerSchedule(1, 5, 5);
        assertEq(s.length, 0);
    }

    function test_constructor_zeroAddress_reverts() public {
        vm.expectRevert(ValidatorEpochScheduleView.ZeroAddress.selector);
        new ValidatorEpochScheduleView(address(0));
    }
}
