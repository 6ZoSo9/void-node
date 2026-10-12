// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenRegistry {
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

contract ValidatorSelectionRegistryTest is Test {
    MockVoidTokenRegistry internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;

    address internal admin = address(0xAD01);
    address internal controller = address(0xA11CE);
    address internal reward = address(0xBEEF);
    bytes32 internal consensusKey = bytes32(uint256(123456789));
    uint256 internal constant MIN_STAKE = 1000 ether;
    uint256 internal constant UNBOND = 7 days;

    function setUp() public {
        token = new MockVoidTokenRegistry();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));

        token.mint(controller, 5000 ether);

        vm.startPrank(controller);
        token.approve(address(staking), type(uint256).max);
        vm.stopPrank();
    }

    function test_registry_forwardsSelectionReads() public {
        vm.startPrank(controller);
        staking.registerAndStake(reward, consensusKey, MIN_STAKE);
        staking.activate();
        vm.stopPrank();

        assertEq(registry.getSelectableValidatorCount(), 1);
        assertEq(registry.totalSelectablePower(), MIN_STAKE);

        IValidatorSelectionSource.SelectableValidator memory v = registry.getSelectableValidatorAt(0);
        assertEq(v.reward, reward);
        assertEq(v.controller, controller);
        assertEq(v.consensusKey, consensusKey);
        assertEq(v.effectivePower, MIN_STAKE);
    }

    function test_onlyAdminCanSetSelectionSource() public {
        vm.expectRevert(ValidatorSelectionRegistry.NotAdmin.selector);
        registry.setSelectionSource(address(0x1234));

        vm.prank(admin);
        registry.setSelectionSource(address(adapter));

        assertEq(address(registry.selectionSource()), address(adapter));
    }

    function test_setSelectionSource_zero_reverts() public {
        vm.prank(admin);
        vm.expectRevert(ValidatorSelectionRegistry.ZeroAddress.selector);
        registry.setSelectionSource(address(0));
    }

    function test_onlyAdminCanSetAdmin() public {
        vm.expectRevert(ValidatorSelectionRegistry.NotAdmin.selector);
        registry.setAdmin(address(0xBEEF));

        vm.prank(admin);
        registry.setAdmin(address(0xBEEF));

        assertEq(registry.admin(), address(0xBEEF));
    }

    function test_setAdmin_zero_reverts() public {
        vm.prank(admin);
        vm.expectRevert(ValidatorSelectionRegistry.ZeroAddress.selector);
        registry.setAdmin(address(0));
    }
}
