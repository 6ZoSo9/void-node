// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/ValidatorEpochProposerSelector.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenEpochProposer {
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

contract ValidatorEpochProposerSelectorTest is Test {
    MockVoidTokenEpochProposer internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;
    ValidatorSelectionOrderedView internal ordered;
    ValidatorEpochSnapshot internal snapshot;
    ValidatorEpochProposerSelector internal selector;

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
        token = new MockVoidTokenEpochProposer();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ordered = new ValidatorSelectionOrderedView(address(registry));
        snapshot = new ValidatorEpochSnapshot(admin, address(ordered));
        selector = new ValidatorEpochProposerSelector(address(snapshot));

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

    function _expected(uint256 epoch, uint256 slot)
        internal
        view
        returns (address reward, uint256 power)
    {
        uint256 total = snapshot.getEpochTotalPower(epoch);
        uint256 count = snapshot.getEpochValidatorCount(epoch);
        uint256 pick = uint256(keccak256(abi.encodePacked(epoch, slot))) % total;
        uint256 cumulative = 0;

        for (uint256 i = 0; i < count; i++) {
            IValidatorSelectionSource.SelectableValidator memory v = snapshot.getEpochValidatorAt(epoch, i);
            cumulative += v.effectivePower;
            if (pick < cumulative) {
                return (v.reward, v.effectivePower);
            }
        }

        revert("expected_not_found");
    }

    function test_epoch1SelectionMatchesFrozenSnapshot() public {
        assertEq(selector.validatorCount(1), 3);
        assertEq(selector.totalPower(1), 4500 ether);

        for (uint256 slot = 0; slot < 16; slot++) {
            (address reward, uint256 power) = _expected(1, slot);
            IValidatorSelectionSource.SelectableValidator memory v = selector.proposerForSlot(1, slot);
            assertEq(v.reward, reward);
            assertEq(v.effectivePower, power);
        }
    }

    function test_epoch2SelectionMatchesChangedSnapshot() public {
        assertEq(selector.validatorCount(2), 2);
        assertEq(selector.totalPower(2), 2500 ether);

        for (uint256 slot = 0; slot < 16; slot++) {
            (address reward, uint256 power) = _expected(2, slot);
            IValidatorSelectionSource.SelectableValidator memory v = selector.proposerForSlot(2, slot);
            assertEq(v.reward, reward);
            assertEq(v.effectivePower, power);
        }
    }

    function test_sameSlotCanDifferAcrossEpochs() public {
        bool foundDiff = false;
        for (uint256 slot = 0; slot < 256; slot++) {
            IValidatorSelectionSource.SelectableValidator memory e1 = selector.proposerForSlot(1, slot);
            IValidatorSelectionSource.SelectableValidator memory e2 = selector.proposerForSlot(2, slot);
            if (e1.reward != e2.reward || e1.effectivePower != e2.effectivePower) {
                foundDiff = true;
                break;
            }
        }
        assertTrue(foundDiff);
    }

    function test_constructor_zeroAddress_reverts() public {
        vm.expectRevert(ValidatorEpochProposerSelector.ZeroAddress.selector);
        new ValidatorEpochProposerSelector(address(0));
    }
}
