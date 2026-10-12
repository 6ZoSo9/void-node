// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ValidatorEpochSnapshot} from "./ValidatorEpochSnapshot.sol";
import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorEpochProposerSelector {
    error ZeroAddress();
    error EmptyEpoch();
    error SnapshotInconsistent();

    ValidatorEpochSnapshot public immutable snapshot;

    constructor(address snapshot_) {
        if (snapshot_ == address(0)) revert ZeroAddress();
        snapshot = ValidatorEpochSnapshot(snapshot_);
    }

    function validatorCount(uint256 epoch) external view returns (uint256) {
        return snapshot.getEpochValidatorCount(epoch);
    }

    function totalPower(uint256 epoch) external view returns (uint256) {
        return snapshot.getEpochTotalPower(epoch);
    }

    function proposerForSlot(uint256 epoch, uint256 slot)
        public
        view
        returns (IValidatorSelectionSource.SelectableValidator memory)
    {
        uint256 total = snapshot.getEpochTotalPower(epoch);
        if (total == 0) revert EmptyEpoch();

        uint256 count = snapshot.getEpochValidatorCount(epoch);
        uint256 pick = uint256(keccak256(abi.encodePacked(epoch, slot))) % total;
        uint256 cumulative = 0;

        for (uint256 i = 0; i < count; i++) {
            IValidatorSelectionSource.SelectableValidator memory v = snapshot.getEpochValidatorAt(epoch, i);
            cumulative += v.effectivePower;
            if (pick < cumulative) {
                return v;
            }
        }

        revert SnapshotInconsistent();
    }

    function proposerRewardForSlot(uint256 epoch, uint256 slot) external view returns (address) {
        return proposerForSlot(epoch, slot).reward;
    }
}
