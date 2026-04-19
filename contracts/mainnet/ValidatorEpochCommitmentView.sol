// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ValidatorEpochSnapshot} from "./ValidatorEpochSnapshot.sol";
import {ValidatorEpochScheduleView} from "./ValidatorEpochScheduleView.sol";
import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorEpochCommitmentView {
    error ZeroAddress();

    ValidatorEpochSnapshot public immutable snapshot;
    ValidatorEpochScheduleView public immutable scheduleView;

    constructor(address snapshot_, address scheduleView_) {
        if (snapshot_ == address(0) || scheduleView_ == address(0)) revert ZeroAddress();
        snapshot = ValidatorEpochSnapshot(snapshot_);
        scheduleView = ValidatorEpochScheduleView(scheduleView_);
    }

    function validatorSetCommitment(uint256 epoch) public view returns (bytes32 h) {
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

    function scheduleWindowCommitment(
        uint256 epoch,
        uint256 startSlot,
        uint256 endSlotExclusive
    ) public view returns (bytes32 h) {
        uint256 len = scheduleView.scheduleLength(startSlot, endSlotExclusive);
        h = keccak256(abi.encodePacked("schedule-window-v1", epoch, startSlot, endSlotExclusive, len));

        for (uint256 slot = startSlot; slot < endSlotExclusive; slot++) {
            ValidatorEpochScheduleView.SlotProposer memory s = scheduleView.slotProposer(epoch, slot);
            h = keccak256(abi.encodePacked(
                h,
                s.slot,
                s.reward,
                s.effectivePower
            ));
        }
    }

    function epochWindowCommitment(
        uint256 epoch,
        uint256 startSlot,
        uint256 endSlotExclusive
    ) external view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "epoch-window-v1",
            epoch,
            validatorSetCommitment(epoch),
            scheduleWindowCommitment(epoch, startSlot, endSlotExclusive)
        ));
    }
}
