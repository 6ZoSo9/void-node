// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ValidatorEpochSnapshot} from "./ValidatorEpochSnapshot.sol";
import {ValidatorEpochCommitmentView} from "./ValidatorEpochCommitmentView.sol";
import {ValidatorEpochCommitmentRegistry} from "./ValidatorEpochCommitmentRegistry.sol";

contract ValidatorEpochManifestView {
    error ZeroAddress();

    struct EpochManifest {
        uint256 epoch;
        uint256 requestedStartSlot;
        uint256 requestedEndSlotExclusive;
        uint256 validatorCount;
        uint256 totalPower;
        bytes32 validatorSetCommitment;
        bytes32 scheduleWindowCommitment;
        bytes32 epochWindowCommitment;
        bool published;
        bool publishedMatch;
        uint256 publishedStartSlot;
        uint256 publishedEndSlotExclusive;
        bytes32 publishedValidatorSetCommitment;
        bytes32 publishedScheduleWindowCommitment;
        bytes32 publishedEpochWindowCommitment;
    }

    ValidatorEpochSnapshot public immutable snapshot;
    ValidatorEpochCommitmentView public immutable commitmentView;
    ValidatorEpochCommitmentRegistry public immutable commitmentRegistry;

    constructor(
        address snapshot_,
        address commitmentView_,
        address commitmentRegistry_
    ) {
        if (
            snapshot_ == address(0) ||
            commitmentView_ == address(0) ||
            commitmentRegistry_ == address(0)
        ) revert ZeroAddress();

        snapshot = ValidatorEpochSnapshot(snapshot_);
        commitmentView = ValidatorEpochCommitmentView(commitmentView_);
        commitmentRegistry = ValidatorEpochCommitmentRegistry(commitmentRegistry_);
    }

    function manifestForEpoch(
        uint256 epoch,
        uint256 startSlot,
        uint256 endSlotExclusive
    ) external view returns (EpochManifest memory m) {
        m.epoch = epoch;
        m.requestedStartSlot = startSlot;
        m.requestedEndSlotExclusive = endSlotExclusive;
        m.validatorCount = snapshot.getEpochValidatorCount(epoch);
        m.totalPower = snapshot.getEpochTotalPower(epoch);
        m.validatorSetCommitment = commitmentView.validatorSetCommitment(epoch);
        m.scheduleWindowCommitment = commitmentView.scheduleWindowCommitment(epoch, startSlot, endSlotExclusive);
        m.epochWindowCommitment = commitmentView.epochWindowCommitment(epoch, startSlot, endSlotExclusive);

        ValidatorEpochCommitmentRegistry.PublishedEpochCommitment memory p = commitmentRegistry.readPublished(epoch);
        if (p.published) {
            m.published = true;
            m.publishedMatch = commitmentRegistry.isPublishedMatch(epoch);
            m.publishedStartSlot = p.startSlot;
            m.publishedEndSlotExclusive = p.endSlotExclusive;
            m.publishedValidatorSetCommitment = p.validatorSetCommitment;
            m.publishedScheduleWindowCommitment = p.scheduleWindowCommitment;
            m.publishedEpochWindowCommitment = p.epochWindowCommitment;
        }
    }
}
