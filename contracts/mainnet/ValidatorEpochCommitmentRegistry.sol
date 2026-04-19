// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ValidatorEpochCommitmentView} from "./ValidatorEpochCommitmentView.sol";

contract ValidatorEpochCommitmentRegistry {
    error ZeroAddress();
    error NotAdmin();
    error EpochAlreadyPublished();
    error EpochNotPublished();

    struct PublishedEpochCommitment {
        bool published;
        uint256 startSlot;
        uint256 endSlotExclusive;
        bytes32 validatorSetCommitment;
        bytes32 scheduleWindowCommitment;
        bytes32 epochWindowCommitment;
    }

    address public admin;
    ValidatorEpochCommitmentView public immutable commitmentView;

    mapping(uint256 => PublishedEpochCommitment) internal _published;

    event EpochPublished(
        uint256 indexed epoch,
        uint256 startSlot,
        uint256 endSlotExclusive,
        bytes32 validatorSetCommitment,
        bytes32 scheduleWindowCommitment,
        bytes32 epochWindowCommitment
    );

    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);

    constructor(address admin_, address commitmentView_) {
        if (admin_ == address(0) || commitmentView_ == address(0)) revert ZeroAddress();
        admin = admin_;
        commitmentView = ValidatorEpochCommitmentView(commitmentView_);
    }

    function setAdmin(address newAdmin) external {
        if (msg.sender != admin) revert NotAdmin();
        if (newAdmin == address(0)) revert ZeroAddress();

        address old = admin;
        admin = newAdmin;
        emit AdminUpdated(old, newAdmin);
    }

    function publishEpochWindow(
        uint256 epoch,
        uint256 startSlot,
        uint256 endSlotExclusive
    ) external {
        if (msg.sender != admin) revert NotAdmin();
        if (_published[epoch].published) revert EpochAlreadyPublished();

        bytes32 v = commitmentView.validatorSetCommitment(epoch);
        bytes32 s = commitmentView.scheduleWindowCommitment(epoch, startSlot, endSlotExclusive);
        bytes32 e = commitmentView.epochWindowCommitment(epoch, startSlot, endSlotExclusive);

        _published[epoch] = PublishedEpochCommitment({
            published: true,
            startSlot: startSlot,
            endSlotExclusive: endSlotExclusive,
            validatorSetCommitment: v,
            scheduleWindowCommitment: s,
            epochWindowCommitment: e
        });

        emit EpochPublished(epoch, startSlot, endSlotExclusive, v, s, e);
    }

    function readPublished(uint256 epoch) external view returns (PublishedEpochCommitment memory) {
        return _published[epoch];
    }

    function publishedEpochWindowCommitment(uint256 epoch) external view returns (bytes32) {
        if (!_published[epoch].published) revert EpochNotPublished();
        return _published[epoch].epochWindowCommitment;
    }

    function isPublishedMatch(uint256 epoch) external view returns (bool) {
        PublishedEpochCommitment memory p = _published[epoch];
        if (!p.published) return false;

        bytes32 v = commitmentView.validatorSetCommitment(epoch);
        bytes32 s = commitmentView.scheduleWindowCommitment(epoch, p.startSlot, p.endSlotExclusive);
        bytes32 e = commitmentView.epochWindowCommitment(epoch, p.startSlot, p.endSlotExclusive);

        return (
            v == p.validatorSetCommitment &&
            s == p.scheduleWindowCommitment &&
            e == p.epochWindowCommitment
        );
    }
}
