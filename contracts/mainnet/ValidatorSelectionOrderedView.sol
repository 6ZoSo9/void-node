// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorSelectionOrderedView is IValidatorSelectionSource {
    error ZeroAddress();
    error IndexOutOfBounds();

    IValidatorSelectionSource public immutable source;

    constructor(address source_) {
        if (source_ == address(0)) revert ZeroAddress();
        source = IValidatorSelectionSource(source_);
    }

    function getSelectableValidatorCount() external view override returns (uint256) {
        return source.getSelectableValidatorCount();
    }

    function totalSelectablePower() external view override returns (uint256) {
        return source.totalSelectablePower();
    }

    function getSelectableValidatorAt(uint256 index) external view override returns (SelectableValidator memory) {
        SelectableValidator[] memory vals = _ordered();
        if (index >= vals.length) revert IndexOutOfBounds();
        return vals[index];
    }

    function _ordered() internal view returns (SelectableValidator[] memory vals) {
        uint256 n = source.getSelectableValidatorCount();
        vals = new SelectableValidator[](n);

        for (uint256 i = 0; i < n; i++) {
            vals[i] = source.getSelectableValidatorAt(i);
        }

        if (n < 2) return vals;

        for (uint256 i = 1; i < n; i++) {
            SelectableValidator memory key = vals[i];
            uint256 j = i;

            while (j > 0 && _comesBefore(key, vals[j - 1])) {
                vals[j] = vals[j - 1];
                unchecked { j--; }
            }

            vals[j] = key;
        }
    }

    function _comesBefore(
        SelectableValidator memory a,
        SelectableValidator memory b
    ) internal pure returns (bool) {
        if (a.effectivePower > b.effectivePower) return true;
        if (a.effectivePower < b.effectivePower) return false;
        return uint160(a.reward) < uint160(b.reward);
    }
}
