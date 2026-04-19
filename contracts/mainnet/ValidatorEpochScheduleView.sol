// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ValidatorEpochProposerSelector} from "./ValidatorEpochProposerSelector.sol";
import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorEpochScheduleView {
    error ZeroAddress();

    struct SlotProposer {
        uint256 slot;
        address reward;
        uint256 effectivePower;
    }

    ValidatorEpochProposerSelector public immutable selector;

    constructor(address selector_) {
        if (selector_ == address(0)) revert ZeroAddress();
        selector = ValidatorEpochProposerSelector(selector_);
    }

    function scheduleLength(uint256 startSlot, uint256 endSlotExclusive) public pure returns (uint256) {
        if (endSlotExclusive <= startSlot) return 0;
        return endSlotExclusive - startSlot;
    }

    function slotProposer(uint256 epoch, uint256 slot) public view returns (SlotProposer memory out) {
        IValidatorSelectionSource.SelectableValidator memory v = selector.proposerForSlot(epoch, slot);
        out = SlotProposer({
            slot: slot,
            reward: v.reward,
            effectivePower: v.effectivePower
        });
    }

    function proposerSchedule(
        uint256 epoch,
        uint256 startSlot,
        uint256 endSlotExclusive
    ) external view returns (SlotProposer[] memory out) {
        uint256 n = scheduleLength(startSlot, endSlotExclusive);
        out = new SlotProposer[](n);

        for (uint256 i = 0; i < n; i++) {
            uint256 slot = startSlot + i;
            out[i] = slotProposer(epoch, slot);
        }
    }
}
