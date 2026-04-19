// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorEpochSnapshot {
    error ZeroAddress();
    error NotAdmin();
    error EpochAlreadyCaptured();
    error IndexOutOfBounds();

    struct EpochMeta {
        bool captured;
        uint256 count;
        uint256 totalPower;
    }

    address public admin;
    IValidatorSelectionSource public immutable source;

    mapping(uint256 => EpochMeta) public epochMeta;
    mapping(uint256 => IValidatorSelectionSource.SelectableValidator[]) internal epochValidators;

    event EpochCaptured(uint256 indexed epoch, uint256 count, uint256 totalPower);
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);

    constructor(address admin_, address source_) {
        if (admin_ == address(0) || source_ == address(0)) revert ZeroAddress();
        admin = admin_;
        source = IValidatorSelectionSource(source_);
    }

    function setAdmin(address newAdmin) external {
        if (msg.sender != admin) revert NotAdmin();
        if (newAdmin == address(0)) revert ZeroAddress();

        address old = admin;
        admin = newAdmin;
        emit AdminUpdated(old, newAdmin);
    }

    function captureEpoch(uint256 epoch) external {
        if (msg.sender != admin) revert NotAdmin();
        if (epochMeta[epoch].captured) revert EpochAlreadyCaptured();

        uint256 n = source.getSelectableValidatorCount();
        uint256 total = source.totalSelectablePower();

        epochMeta[epoch] = EpochMeta({
            captured: true,
            count: n,
            totalPower: total
        });

        for (uint256 i = 0; i < n; i++) {
            epochValidators[epoch].push(source.getSelectableValidatorAt(i));
        }

        emit EpochCaptured(epoch, n, total);
    }

    function getEpochValidatorCount(uint256 epoch) external view returns (uint256) {
        return epochMeta[epoch].count;
    }

    function getEpochTotalPower(uint256 epoch) external view returns (uint256) {
        return epochMeta[epoch].totalPower;
    }

    function getEpochValidatorAt(uint256 epoch, uint256 index)
        external
        view
        returns (IValidatorSelectionSource.SelectableValidator memory)
    {
        if (index >= epochValidators[epoch].length) revert IndexOutOfBounds();
        return epochValidators[epoch][index];
    }
}
