// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorSelectionSource} from "./IValidatorSelectionSource.sol";

contract ValidatorEpochSnapshot {
    error ZeroAddress();
    error NotAdmin();
    error EpochAlreadyCaptured();
    error IndexOutOfBounds();
    error EpochCaptureAlreadyStarted();
    error EpochCaptureNotStarted();
    error EpochCaptureIncomplete();
    error InvalidChunkSize();

    struct EpochMeta {
        bool captured;
        uint256 count;
        uint256 totalPower;
    }

    struct PendingEpochCapture {
        bool started;
        uint256 count;
        uint256 totalPower;
        uint256 nextIndex;
    }

    address public admin;
    IValidatorSelectionSource public immutable source;

    mapping(uint256 => EpochMeta) public epochMeta;
    mapping(uint256 => IValidatorSelectionSource.SelectableValidator[]) internal epochValidators;
    mapping(uint256 => PendingEpochCapture) public pendingEpochCapture;

    event EpochCaptureStarted(uint256 indexed epoch, uint256 count, uint256 totalPower);
    event EpochCaptureProgress(uint256 indexed epoch, uint256 startIndex, uint256 endIndexExclusive, uint256 count);
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

    function beginEpochCapture(uint256 epoch) public {
        if (msg.sender != admin) revert NotAdmin();
        if (epochMeta[epoch].captured) revert EpochAlreadyCaptured();
        if (pendingEpochCapture[epoch].started) revert EpochCaptureAlreadyStarted();

        uint256 n = source.getSelectableValidatorCount();
        uint256 total = source.totalSelectablePower();

        delete epochValidators[epoch];
        pendingEpochCapture[epoch] = PendingEpochCapture({
            started: true,
            count: n,
            totalPower: total,
            nextIndex: 0
        });

        emit EpochCaptureStarted(epoch, n, total);
    }

    function appendEpochValidators(uint256 epoch, uint256 maxItems) public {
        if (msg.sender != admin) revert NotAdmin();
        if (maxItems == 0) revert InvalidChunkSize();

        PendingEpochCapture storage p = pendingEpochCapture[epoch];
        if (!p.started) revert EpochCaptureNotStarted();

        uint256 start = p.nextIndex;
        uint256 end = start + maxItems;
        if (end > p.count) end = p.count;

        for (uint256 i = start; i < end; i++) {
            epochValidators[epoch].push(source.getSelectableValidatorAt(i));
        }

        p.nextIndex = end;
        emit EpochCaptureProgress(epoch, start, end, p.count);
    }

    function finalizeEpochCapture(uint256 epoch) public {
        if (msg.sender != admin) revert NotAdmin();

        PendingEpochCapture memory p = pendingEpochCapture[epoch];
        if (!p.started) revert EpochCaptureNotStarted();
        if (p.nextIndex != p.count) revert EpochCaptureIncomplete();

        epochMeta[epoch] = EpochMeta({
            captured: true,
            count: p.count,
            totalPower: p.totalPower
        });

        delete pendingEpochCapture[epoch];
        emit EpochCaptured(epoch, p.count, p.totalPower);
    }

    function captureEpoch(uint256 epoch) external {
        beginEpochCapture(epoch);

        uint256 count = pendingEpochCapture[epoch].count;
        if (count > 0) {
            appendEpochValidators(epoch, count);
        }

        finalizeEpochCapture(epoch);
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
