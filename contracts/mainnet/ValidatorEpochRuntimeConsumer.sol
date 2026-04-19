// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ValidatorEpochSnapshot} from "./ValidatorEpochSnapshot.sol";
import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorEpochRuntimeConsumer {
    error ZeroAddress();

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

    function validatorAt(uint256 epoch, uint256 index)
        external
        view
        returns (IValidatorSelectionSource.SelectableValidator memory)
    {
        return snapshot.getEpochValidatorAt(epoch, index);
    }

    function runtimeSnapshot(uint256 epoch, uint256 index)
        external
        view
        returns (
            uint256 count,
            uint256 total,
            IValidatorSelectionSource.SelectableValidator memory v
        )
    {
        count = snapshot.getEpochValidatorCount(epoch);
        total = snapshot.getEpochTotalPower(epoch);
        v = snapshot.getEpochValidatorAt(epoch, index);
    }
}
