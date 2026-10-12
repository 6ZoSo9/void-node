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
import "../../contracts/mainnet/ValidatorEpochCommitmentView.sol";
import "../../contracts/mainnet/ValidatorEpochCommitmentRegistry.sol";

contract MockVoidTokenEpochCommitmentRegistry {
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

contract ValidatorEpochCommitmentRegistryTest is Test {
    MockVoidTokenEpochCommitmentRegistry internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;
    ValidatorSelectionOrderedView internal ordered;
    ValidatorEpochSnapshot internal snapshot;
    ValidatorEpochProposerSelector internal selector;
    ValidatorEpochScheduleView internal scheduleView;
    ValidatorEpochCommitmentView internal commitmentView;
    ValidatorEpochCommitmentRegistry internal commitmentRegistry;

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
        token = new MockVoidTokenEpochCommitmentRegistry();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ordered = new ValidatorSelectionOrderedView(address(registry));
        snapshot = new ValidatorEpochSnapshot(admin, address(ordered));
        selector = new ValidatorEpochProposerSelector(address(snapshot));
        scheduleView = new ValidatorEpochScheduleView(address(selector));
        commitmentView = new ValidatorEpochCommitmentView(address(snapshot), address(scheduleView));
        commitmentRegistry = new ValidatorEpochCommitmentRegistry(admin, address(commitmentView));

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

    function test_publishEpoch1_matchesView() public {
        vm.prank(admin);
        commitmentRegistry.publishEpochWindow(1, 0, 8);

        ValidatorEpochCommitmentRegistry.PublishedEpochCommitment memory p = commitmentRegistry.readPublished(1);
        assertTrue(p.published);
        assertEq(p.startSlot, 0);
        assertEq(p.endSlotExclusive, 8);
        assertEq(p.validatorSetCommitment, commitmentView.validatorSetCommitment(1));
        assertEq(p.scheduleWindowCommitment, commitmentView.scheduleWindowCommitment(1, 0, 8));
        assertEq(p.epochWindowCommitment, commitmentView.epochWindowCommitment(1, 0, 8));
        assertTrue(commitmentRegistry.isPublishedMatch(1));
    }

    function test_publishEpoch2_matchesView() public {
        vm.prank(admin);
        commitmentRegistry.publishEpochWindow(2, 0, 8);

        ValidatorEpochCommitmentRegistry.PublishedEpochCommitment memory p = commitmentRegistry.readPublished(2);
        assertTrue(p.published);
        assertEq(p.startSlot, 0);
        assertEq(p.endSlotExclusive, 8);
        assertEq(p.validatorSetCommitment, commitmentView.validatorSetCommitment(2));
        assertEq(p.scheduleWindowCommitment, commitmentView.scheduleWindowCommitment(2, 0, 8));
        assertEq(p.epochWindowCommitment, commitmentView.epochWindowCommitment(2, 0, 8));
        assertTrue(commitmentRegistry.isPublishedMatch(2));
    }

    function test_epoch1_and_epoch2_publications_differ() public {
        vm.startPrank(admin);
        commitmentRegistry.publishEpochWindow(1, 0, 8);
        commitmentRegistry.publishEpochWindow(2, 0, 8);
        vm.stopPrank();

        ValidatorEpochCommitmentRegistry.PublishedEpochCommitment memory p1 = commitmentRegistry.readPublished(1);
        ValidatorEpochCommitmentRegistry.PublishedEpochCommitment memory p2 = commitmentRegistry.readPublished(2);

        assertTrue(p1.validatorSetCommitment != p2.validatorSetCommitment);
        assertTrue(p1.scheduleWindowCommitment != p2.scheduleWindowCommitment);
        assertTrue(p1.epochWindowCommitment != p2.epochWindowCommitment);
    }

    function test_cannotPublishSameEpochTwice() public {
        vm.startPrank(admin);
        commitmentRegistry.publishEpochWindow(1, 0, 8);
        vm.expectRevert(ValidatorEpochCommitmentRegistry.EpochAlreadyPublished.selector);
        commitmentRegistry.publishEpochWindow(1, 0, 8);
        vm.stopPrank();
    }

    function test_constructor_zeroAddress_reverts() public {
        vm.expectRevert(ValidatorEpochCommitmentRegistry.ZeroAddress.selector);
        new ValidatorEpochCommitmentRegistry(address(0), address(commitmentView));

        vm.expectRevert(ValidatorEpochCommitmentRegistry.ZeroAddress.selector);
        new ValidatorEpochCommitmentRegistry(admin, address(0));
    }
}
