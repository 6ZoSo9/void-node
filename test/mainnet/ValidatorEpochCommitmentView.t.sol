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
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenEpochCommitment {
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

contract ValidatorEpochCommitmentViewTest is Test {
    MockVoidTokenEpochCommitment internal token;
    ValidatorStakingV2 internal staking;
    ValidatorSelectionAdapter internal adapter;
    ValidatorSelectionRegistry internal registry;
    ValidatorSelectionOrderedView internal ordered;
    ValidatorEpochSnapshot internal snapshot;
    ValidatorEpochProposerSelector internal selector;
    ValidatorEpochScheduleView internal scheduleView;
    ValidatorEpochCommitmentView internal commitmentView;

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
        token = new MockVoidTokenEpochCommitment();
        staking = new ValidatorStakingV2(address(token), MIN_STAKE, UNBOND);
        adapter = new ValidatorSelectionAdapter(address(staking));
        registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ordered = new ValidatorSelectionOrderedView(address(registry));
        snapshot = new ValidatorEpochSnapshot(admin, address(ordered));
        selector = new ValidatorEpochProposerSelector(address(snapshot));
        scheduleView = new ValidatorEpochScheduleView(address(selector));
        commitmentView = new ValidatorEpochCommitmentView(address(snapshot), address(scheduleView));

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

    function _expectedValidatorSetCommitment(uint256 epoch) internal view returns (bytes32 h) {
        uint256 count = snapshot.getEpochValidatorCount(epoch);
        uint256 total = snapshot.getEpochTotalPower(epoch);
        h = keccak256(abi.encodePacked("validator-set-v1", epoch, count, total));

        for (uint256 i = 0; i < count; i++) {
            IValidatorSelectionSource.SelectableValidator memory v = snapshot.getEpochValidatorAt(epoch, i);
            h = keccak256(abi.encodePacked(
                h,
                v.reward,
                v.controller,
                v.consensusKey,
                v.effectivePower
            ));
        }
    }

    function _expectedScheduleWindowCommitment(
        uint256 epoch,
        uint256 startSlot,
        uint256 endSlotExclusive
    ) internal view returns (bytes32 h) {
        uint256 len = scheduleView.scheduleLength(startSlot, endSlotExclusive);
        h = keccak256(abi.encodePacked("schedule-window-v1", epoch, startSlot, endSlotExclusive, len));

        for (uint256 slot = startSlot; slot < endSlotExclusive; slot++) {
            ValidatorEpochScheduleView.SlotProposer memory s = scheduleView.slotProposer(epoch, slot);
            h = keccak256(abi.encodePacked(h, s.slot, s.reward, s.effectivePower));
        }
    }

    function test_epoch1_commitments_match_expected() public view {
        bytes32 v = commitmentView.validatorSetCommitment(1);
        bytes32 s = commitmentView.scheduleWindowCommitment(1, 0, 8);

        assertEq(v, _expectedValidatorSetCommitment(1));
        assertEq(s, _expectedScheduleWindowCommitment(1, 0, 8));
    }

    function test_epoch2_commitments_match_expected() public view {
        bytes32 v = commitmentView.validatorSetCommitment(2);
        bytes32 s = commitmentView.scheduleWindowCommitment(2, 0, 8);

        assertEq(v, _expectedValidatorSetCommitment(2));
        assertEq(s, _expectedScheduleWindowCommitment(2, 0, 8));
    }

    function test_epoch1_and_epoch2_commitments_differ() public view {
        bytes32 v1 = commitmentView.validatorSetCommitment(1);
        bytes32 v2 = commitmentView.validatorSetCommitment(2);
        bytes32 s1 = commitmentView.scheduleWindowCommitment(1, 0, 8);
        bytes32 s2 = commitmentView.scheduleWindowCommitment(2, 0, 8);

        assertTrue(v1 != v2);
        assertTrue(s1 != s2);
    }

    function test_epochWindowCommitment_changesAcrossEpochs() public view {
        bytes32 c1 = commitmentView.epochWindowCommitment(1, 0, 8);
        bytes32 c2 = commitmentView.epochWindowCommitment(2, 0, 8);
        assertTrue(c1 != c2);
    }

    function test_constructor_zeroAddress_reverts() public {
        vm.expectRevert(ValidatorEpochCommitmentView.ZeroAddress.selector);
        new ValidatorEpochCommitmentView(address(0), address(scheduleView));

        vm.expectRevert(ValidatorEpochCommitmentView.ZeroAddress.selector);
        new ValidatorEpochCommitmentView(address(snapshot), address(0));
    }
}
