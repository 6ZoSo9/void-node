// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenOrderedView {
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

contract ValidatorSelectionOrderedViewTest is Test {
    MockVoidTokenOrderedView internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;
    ValidatorSelectionOrderedView internal ordered;

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
        token = new MockVoidTokenOrderedView();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ordered = new ValidatorSelectionOrderedView(address(registry));

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
    }

    function _registerThree(uint256 a1, uint256 a2, uint256 a3) internal {
        vm.startPrank(controller1);
        staking.registerAndStake(reward1, key1, a1);
        staking.activate();
        vm.stopPrank();

        vm.startPrank(controller2);
        staking.registerAndStake(reward2, key2, a2);
        staking.activate();
        vm.stopPrank();

        vm.startPrank(controller3);
        staking.registerAndStake(reward3, key3, a3);
        staking.activate();
        vm.stopPrank();
    }

    function test_ordersByPowerDescending() public {
        _registerThree(1000 ether, 2000 ether, 1500 ether);

        assertEq(ordered.getSelectableValidatorCount(), 3);
        assertEq(ordered.totalSelectablePower(), 4500 ether);

        IValidatorSelectionSource.SelectableValidator memory v0 = ordered.getSelectableValidatorAt(0);
        IValidatorSelectionSource.SelectableValidator memory v1 = ordered.getSelectableValidatorAt(1);
        IValidatorSelectionSource.SelectableValidator memory v2 = ordered.getSelectableValidatorAt(2);

        assertEq(v0.reward, reward2);
        assertEq(v0.effectivePower, 2000 ether);

        assertEq(v1.reward, reward3);
        assertEq(v1.effectivePower, 1500 ether);

        assertEq(v2.reward, reward1);
        assertEq(v2.effectivePower, 1000 ether);
    }

    function test_tieBreaksByRewardAddressAscending() public {
        _registerThree(1000 ether, 1000 ether, 1000 ether);

        IValidatorSelectionSource.SelectableValidator memory v0 = ordered.getSelectableValidatorAt(0);
        IValidatorSelectionSource.SelectableValidator memory v1 = ordered.getSelectableValidatorAt(1);
        IValidatorSelectionSource.SelectableValidator memory v2 = ordered.getSelectableValidatorAt(2);

        assertEq(v0.reward, reward1);
        assertEq(v1.reward, reward2);
        assertEq(v2.reward, reward3);
    }

    function test_exitStillProducesOrderedRemainingSet() public {
        _registerThree(1000 ether, 2000 ether, 1500 ether);

        vm.startPrank(controller2);
        staking.beginExit();
        vm.stopPrank();

        assertEq(ordered.getSelectableValidatorCount(), 2);
        assertEq(ordered.totalSelectablePower(), 2500 ether);

        IValidatorSelectionSource.SelectableValidator memory v0 = ordered.getSelectableValidatorAt(0);
        IValidatorSelectionSource.SelectableValidator memory v1 = ordered.getSelectableValidatorAt(1);

        assertEq(v0.reward, reward3);
        assertEq(v0.effectivePower, 1500 ether);

        assertEq(v1.reward, reward1);
        assertEq(v1.effectivePower, 1000 ether);
    }
}
