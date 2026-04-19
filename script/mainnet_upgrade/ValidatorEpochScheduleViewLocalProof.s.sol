// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/ValidatorEpochProposerSelector.sol";
import "../../contracts/mainnet/ValidatorEpochScheduleView.sol";

contract MockVoidTokenEpochScheduleProof {
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

contract ValidatorHelperEpochSchedule {
    function approveToken(address token, address spender, uint256 amount) external {
        MockVoidTokenEpochScheduleProof(token).approve(spender, amount);
    }

    function registerStakeActivate(
        address staking,
        address reward,
        bytes32 consensusKey,
        uint256 amount
    ) external {
        ValidatorStakingV2(staking).registerAndStake(reward, consensusKey, amount);
        ValidatorStakingV2(staking).activate();
    }

    function beginExit(address staking) external {
        ValidatorStakingV2(staking).beginExit();
    }
}

contract ValidatorEpochScheduleViewLocalProof is Script {
    struct Env {
        MockVoidTokenEpochScheduleProof token;
        ValidatorStakingV2 staking;
        ValidatorSelectionAdapter adapter;
        ValidatorSelectionRegistry registry;
        ValidatorSelectionOrderedView ordered;
        ValidatorEpochSnapshot snapshot;
        ValidatorEpochProposerSelector selector;
        ValidatorEpochScheduleView scheduleView;
        ValidatorHelperEpochSchedule h1;
        ValidatorHelperEpochSchedule h2;
        ValidatorHelperEpochSchedule h3;
    }

    function _deploy(address admin) internal returns (Env memory e) {
        e.token = new MockVoidTokenEpochScheduleProof();
        e.staking = new ValidatorStakingV2(address(e.token), 1000 ether, 7 days);
        e.adapter = new ValidatorSelectionAdapter(address(e.staking));
        e.registry = new ValidatorSelectionRegistry(admin, address(e.adapter));
        e.ordered = new ValidatorSelectionOrderedView(address(e.registry));
        e.snapshot = new ValidatorEpochSnapshot(admin, address(e.ordered));
        e.selector = new ValidatorEpochProposerSelector(address(e.snapshot));
        e.scheduleView = new ValidatorEpochScheduleView(address(e.selector));
        e.h1 = new ValidatorHelperEpochSchedule();
        e.h2 = new ValidatorHelperEpochSchedule();
        e.h3 = new ValidatorHelperEpochSchedule();
    }

    function _fundApprove(Env memory e) internal {
        e.token.mint(address(e.h1), 5000 ether);
        e.token.mint(address(e.h2), 5000 ether);
        e.token.mint(address(e.h3), 5000 ether);

        e.h1.approveToken(address(e.token), address(e.staking), type(uint256).max);
        e.h2.approveToken(address(e.token), address(e.staking), type(uint256).max);
        e.h3.approveToken(address(e.token), address(e.staking), type(uint256).max);
    }

    function _registerThree(Env memory e) internal {
        e.h1.registerStakeActivate(address(e.staking), address(0xB101), bytes32(uint256(101)), 1000 ether);
        e.h2.registerStakeActivate(address(e.staking), address(0xB102), bytes32(uint256(102)), 2000 ether);
        e.h3.registerStakeActivate(address(e.staking), address(0xB103), bytes32(uint256(103)), 1500 ether);
    }

    function _logWindow(Env memory e, uint256 epoch, uint256 startSlot, uint256 endSlotExclusive, string memory title) internal view {
        console2.log(title);
        ValidatorEpochScheduleView.SlotProposer[] memory s = e.scheduleView.proposerSchedule(epoch, startSlot, endSlotExclusive);
        for (uint256 i = 0; i < s.length; i++) {
            console2.log("slot", s[i].slot);
            console2.log("reward", s[i].reward);
            console2.log("power", s[i].effectivePower);
        }
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        Env memory e = _deploy(admin);
        _fundApprove(e);
        _registerThree(e);

        e.snapshot.captureEpoch(1);
        _logWindow(e, 1, 0, 8, "=== epoch 1 schedule [0,8) ===");

        e.h2.beginExit(address(e.staking));
        e.snapshot.captureEpoch(2);
        _logWindow(e, 2, 0, 8, "=== epoch 2 schedule [0,8) ===");

        vm.stopBroadcast();
    }
}
