// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IValidatorStakingV2 {
    struct ValidatorInfo {
        address reward;
        address controller;
        bytes32 consensusKey;
        uint256 stakeVOID;
        bool active;
        bool pendingActivation;
        bool pendingExit;
        bool jailed;
        uint256 unbondAmount;
        uint256 unbondReadyAt;
    }

    event ValidatorRegistered(address indexed reward, address indexed controller, bytes32 consensusKey);
    event ValidatorStakeIncreased(address indexed reward, uint256 amount, uint256 newStake);
    event ValidatorActivationRequested(address indexed reward, uint256 stake);
    event ValidatorActivated(address indexed reward, uint256 stake);
    event ValidatorConsensusKeyUpdated(address indexed reward, bytes32 oldKey, bytes32 newKey);
    event ValidatorRewardAddressUpdated(address indexed oldReward, address indexed newReward);
    event ValidatorUnbondStarted(address indexed reward, uint256 amount, uint256 readyAt);
    event ValidatorUnbondFinalized(address indexed reward, uint256 amount, uint256 remainingStake);
    event ValidatorExited(address indexed reward);

    function minStake() external view returns (uint256);
    function unbondingPeriodSeconds() external view returns (uint256);

    function registerValidator(address reward, bytes32 consensusKey) external;
    function registerAndStake(address reward, bytes32 consensusKey, uint256 amount) external;
    function stake(uint256 amount) external;
    function stakeFor(address reward, uint256 amount) external;
    function activate() external;
    function increaseStake(uint256 amount) external;
    function beginUnbond(uint256 amount) external;
    function finalizeUnbond() external;
    function beginExit() external;
    function finalizeExit() external;
    function setRewardAddress(address newReward) external;
    function setConsensusKey(bytes32 newConsensusKey) external;

    function getValidator(address reward) external view returns (ValidatorInfo memory);
    function getActiveValidators() external view returns (address[] memory rewards, uint256[] memory stakeVOID);
    function getValidatorCount() external view returns (uint256);
    function isActiveValidator(address reward) external view returns (bool);
    function stakeOf(address reward) external view returns (uint256);
}
