// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorSelectionRegistry is IValidatorSelectionSource {
    error ZeroAddress();
    error NotAdmin();

    address public admin;
    IValidatorSelectionSource public selectionSource;

    event SelectionSourceUpdated(address indexed oldSource, address indexed newSource);
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);

    constructor(address admin_, address selectionSource_) {
        if (admin_ == address(0)) revert ZeroAddress();
        if (selectionSource_ == address(0)) revert ZeroAddress();
        admin = admin_;
        selectionSource = IValidatorSelectionSource(selectionSource_);
    }

    function setSelectionSource(address newSource) external {
        if (msg.sender != admin) revert NotAdmin();
        if (newSource == address(0)) revert ZeroAddress();

        address old = address(selectionSource);
        selectionSource = IValidatorSelectionSource(newSource);

        emit SelectionSourceUpdated(old, newSource);
    }

    function setAdmin(address newAdmin) external {
        if (msg.sender != admin) revert NotAdmin();
        if (newAdmin == address(0)) revert ZeroAddress();

        address old = admin;
        admin = newAdmin;

        emit AdminUpdated(old, newAdmin);
    }

    function getSelectableValidatorCount() external view override returns (uint256) {
        return selectionSource.getSelectableValidatorCount();
    }

    function getSelectableValidatorAt(uint256 index) external view override returns (SelectableValidator memory) {
        return selectionSource.getSelectableValidatorAt(index);
    }

    function totalSelectablePower() external view override returns (uint256) {
        return selectionSource.totalSelectablePower();
    }
}
