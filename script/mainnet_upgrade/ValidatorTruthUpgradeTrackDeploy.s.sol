// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/ValidatorEpochProposerSelector.sol";
import "../../contracts/mainnet/ValidatorEpochScheduleView.sol";
import "../../contracts/mainnet/ValidatorEpochCommitmentView.sol";
import "../../contracts/mainnet/ValidatorEpochCommitmentRegistry.sol";
import "../../contracts/mainnet/ValidatorEpochManifestView.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

interface IERC20ApproveLike {
    function balanceOf(address who) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract ValidatorTruthUpgradeTrackDeploy is Script {
    struct Env {
        ValidatorStakingV2 staking;
        ValidatorSelectionAdapter adapter;
        ValidatorSelectionOrderedView ordered;
        ValidatorEpochSnapshot snapshot;
        ValidatorEpochProposerSelector selector;
        ValidatorEpochScheduleView scheduleView;
        ValidatorEpochCommitmentView commitmentView;
        ValidatorEpochCommitmentRegistry commitmentRegistry;
        ValidatorEpochManifestView manifestView;
    }

    function _deploy(address token, address admin, address existingStaking) internal returns (Env memory e) {
        if (existingStaking == address(0)) {
            e.staking = new ValidatorStakingV2(token, 1000 ether, 7 days);
        } else {
            e.staking = ValidatorStakingV2(existingStaking);
        }

        e.adapter = new ValidatorSelectionAdapter(address(e.staking));
        e.ordered = new ValidatorSelectionOrderedView(address(e.adapter));
        e.snapshot = new ValidatorEpochSnapshot(admin, address(e.ordered));
        e.selector = new ValidatorEpochProposerSelector(address(e.snapshot));
        e.scheduleView = new ValidatorEpochScheduleView(address(e.selector));
        e.commitmentView = new ValidatorEpochCommitmentView(address(e.snapshot), address(e.scheduleView));
        e.commitmentRegistry = new ValidatorEpochCommitmentRegistry(admin, address(e.commitmentView));
        e.manifestView = new ValidatorEpochManifestView(
            address(e.snapshot),
            address(e.commitmentView),
            address(e.commitmentRegistry)
        );
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address sender = vm.addr(pk);

        address existingStaking = vm.envAddress("EXISTING_STAKING");
        uint256 epoch = vm.envUint("CAPTURE_EPOCH");
        uint256 startSlot = vm.envUint("START_SLOT");
        uint256 endSlotExclusive = vm.envUint("END_SLOT_EXCLUSIVE");
        uint256 chunkSize = vm.envUint("CAPTURE_CHUNK_SIZE");

        bool seedMode = existingStaking == address(0);

        address token = address(0);
        address reward = address(0);
        bytes32 consensusKey = bytes32(0);
        uint256 stake = 0;

        require(chunkSize > 0, "invalid_chunk");
        require(endSlotExclusive > startSlot, "invalid_window");

        if (seedMode) {
            token = vm.envAddress("VOID_TOKEN");
            reward = vm.envAddress("REWARD_ADDRESS");
            consensusKey = vm.envBytes32("CONSENSUS_KEY");
            stake = vm.envUint("STAKE_VOID");

            require(stake >= 1000 ether, "stake_below_min");
            require(consensusKey != bytes32(0), "zero_consensus_key");
            require(IERC20ApproveLike(token).balanceOf(sender) >= stake, "insufficient_void_balance");
        }

        vm.startBroadcast(pk);

        Env memory e = _deploy(token, sender, existingStaking);

        if (seedMode) {
            bool ok = IERC20ApproveLike(token).approve(address(e.staking), stake);
            require(ok, "approve_failed");

            e.staking.registerAndStake(reward, consensusKey, stake);
            e.staking.activate();
        }

        e.snapshot.beginEpochCapture(epoch);

        uint256 count = IValidatorSelectionSource(address(e.ordered)).getSelectableValidatorCount();
        for (uint256 i = 0; i < count; i += chunkSize) {
            uint256 take = count - i;
            if (take > chunkSize) take = chunkSize;
            e.snapshot.appendEpochValidators(epoch, take);
        }

        e.snapshot.finalizeEpochCapture(epoch);
        e.commitmentRegistry.publishEpochWindow(epoch, startSlot, endSlotExclusive);

        console2.log("UPGRADE_TRACK staking", address(e.staking));
        console2.log("UPGRADE_TRACK adapter", address(e.adapter));
        console2.log("UPGRADE_TRACK ordered", address(e.ordered));
        console2.log("UPGRADE_TRACK snapshot", address(e.snapshot));
        console2.log("UPGRADE_TRACK selector", address(e.selector));
        console2.log("UPGRADE_TRACK scheduleView", address(e.scheduleView));
        console2.log("UPGRADE_TRACK commitmentView", address(e.commitmentView));
        console2.log("UPGRADE_TRACK commitmentRegistry", address(e.commitmentRegistry));
        console2.log("UPGRADE_TRACK manifestView", address(e.manifestView));

        vm.stopBroadcast();
    }
}
