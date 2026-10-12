// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IValidatorSelectionSource {
    struct SelectableValidator {
        address reward;
        address controller;
        bytes32 consensusKey;
        uint256 effectivePower;
    }

    function getSelectableValidatorCount() external view returns (uint256);
    function getSelectableValidatorAt(uint256 index) external view returns (SelectableValidator memory);
    function totalSelectablePower() external view returns (uint256);
}
