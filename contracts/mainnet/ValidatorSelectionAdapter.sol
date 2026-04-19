// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorTruthSource} from "./IValidatorTruthSource.sol";
import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorSelectionAdapter is IValidatorSelectionSource {
    error ZeroAddress();
    error IndexOutOfBounds();

    IValidatorTruthSource public immutable truthSource;

    constructor(address truthSource_) {
        if (truthSource_ == address(0)) revert ZeroAddress();
        truthSource = IValidatorTruthSource(truthSource_);
    }

    function getSelectableValidatorCount() external view override returns (uint256 count) {
        uint256 n = truthSource.getActiveValidatorCount();
        for (uint256 i = 0; i < n; i++) {
            address reward = truthSource.getActiveValidatorAt(i);
            if (truthSource.isSelectableValidator(reward)) {
                count++;
            }
        }
    }

    function getSelectableValidatorAt(uint256 index) external view override returns (SelectableValidator memory out) {
        uint256 n = truthSource.getActiveValidatorCount();
        uint256 seen = 0;

        for (uint256 i = 0; i < n; i++) {
            address reward = truthSource.getActiveValidatorAt(i);
            if (!truthSource.isSelectableValidator(reward)) continue;

            if (seen == index) {
                IValidatorTruthSource.ValidatorTruth memory truth = truthSource.getValidatorTruth(reward);
                return SelectableValidator({
                    reward: truth.reward,
                    controller: truth.controller,
                    consensusKey: truth.consensusKey,
                    effectivePower: truthSource.effectivePowerOf(reward)
                });
            }

            seen++;
        }

        revert IndexOutOfBounds();
    }

    function totalSelectablePower() external view override returns (uint256 total) {
        uint256 n = truthSource.getActiveValidatorCount();
        for (uint256 i = 0; i < n; i++) {
            address reward = truthSource.getActiveValidatorAt(i);
            total += truthSource.effectivePowerOf(reward);
        }
    }
}
