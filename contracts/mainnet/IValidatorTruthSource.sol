// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IValidatorTruthSource {
    struct ValidatorTruth {
        address reward;
        address controller;
        bytes32 consensusKey;
        uint256 stakeVOID;
        bool active;
        bool pendingExit;
        bool jailed;
    }

    function minStake() external view returns (uint256);

    function getActiveValidatorCount() external view returns (uint256);
    function getActiveValidatorAt(uint256 index) external view returns (address reward);
    function getActiveValidators() external view returns (address[] memory rewards, uint256[] memory stakeVOID);

    function getValidatorTruth(address reward) external view returns (ValidatorTruth memory);
    function isSelectableValidator(address reward) external view returns (bool);
    function effectivePowerOf(address reward) external view returns (uint256);
}
