// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorRuntimeConsumer {
    error ZeroAddress();

    IValidatorSelectionSource public immutable selectionSource;

    constructor(address selectionSource_) {
        if (selectionSource_ == address(0)) revert ZeroAddress();
        selectionSource = IValidatorSelectionSource(selectionSource_);
    }

    function validatorCount() external view returns (uint256) {
        return selectionSource.getSelectableValidatorCount();
    }

    function totalPower() external view returns (uint256) {
        return selectionSource.totalSelectablePower();
    }

    function validatorAt(uint256 index) external view returns (IValidatorSelectionSource.SelectableValidator memory) {
        return selectionSource.getSelectableValidatorAt(index);
    }

    function runtimeSnapshot(uint256 index)
        external
        view
        returns (
            uint256 count,
            uint256 total,
            IValidatorSelectionSource.SelectableValidator memory v
        )
    {
        count = selectionSource.getSelectableValidatorCount();
        total = selectionSource.totalSelectablePower();
        v = selectionSource.getSelectableValidatorAt(index);
    }
}
