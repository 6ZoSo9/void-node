// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorStakingV2} from "./IValidatorStakingV2.sol";
import {IValidatorTruthSource} from "./IValidatorTruthSource.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ValidatorStakingV2 is IValidatorStakingV2, IValidatorTruthSource {
    error ZeroAddress();
    error InvalidAmount();
    error InvalidConsensusKey();
    error ValidatorAlreadyRegistered();
    error ValidatorNotFound();
    error RewardAlreadyInUse();
    error ControllerAlreadyAssigned();
    error NotValidatorController();
    error ValidatorAlreadyActive();
    error MinStakeNotMet();
    error PendingUnbondExists();
    error UnbondNotReady();
    error TokenTransferFailed();

    IERC20Minimal public immutable voidToken;
    uint256 public immutable override(IValidatorStakingV2, IValidatorTruthSource) minStake;
    uint256 public immutable override unbondingPeriodSeconds;

    mapping(address => ValidatorInfo) internal _validatorsByReward;
    mapping(address => address) public controllerToReward;

    address[] internal _allValidators;
    address[] internal _activeValidators;

    constructor(address voidToken_, uint256 minStake_, uint256 unbondingPeriodSeconds_) {
        if (voidToken_ == address(0)) revert ZeroAddress();
        if (minStake_ == 0) revert InvalidAmount();

        voidToken = IERC20Minimal(voidToken_);
        minStake = minStake_;
        unbondingPeriodSeconds = unbondingPeriodSeconds_;
    }

    function registerValidator(address reward, bytes32 consensusKey) external override {
        _register(msg.sender, reward, consensusKey);
    }

    function registerAndStake(address reward, bytes32 consensusKey, uint256 amount) external override {
        if (controllerToReward[msg.sender] == address(0)) {
            _register(msg.sender, reward, consensusKey);
        } else {
            address existing = controllerToReward[msg.sender];
            if (existing != reward) revert RewardAlreadyInUse();
        }
        _stakeFrom(msg.sender, reward, amount);
    }

    function stake(uint256 amount) external override {
        address reward = _rewardOfController(msg.sender);
        _stakeFrom(msg.sender, reward, amount);
    }

    function stakeFor(address reward, uint256 amount) external override {
        _requireValidatorExists(reward);
        _stakeFrom(msg.sender, reward, amount);
    }

    function activate() external override {
        address reward = _rewardOfController(msg.sender);
        ValidatorInfo storage info = _validatorsByReward[reward];

        if (info.active) revert ValidatorAlreadyActive();
        if (info.consensusKey == bytes32(0)) revert InvalidConsensusKey();
        if (info.stakeVOID < minStake) revert MinStakeNotMet();

        emit ValidatorActivationRequested(reward, info.stakeVOID);

        info.active = true;
        info.pendingActivation = false;
        _pushActiveIfMissing(reward);

        emit ValidatorActivated(reward, info.stakeVOID);
    }

    function increaseStake(uint256 amount) external override {
        address reward = _rewardOfController(msg.sender);
        _stakeFrom(msg.sender, reward, amount);
    }

    function beginUnbond(uint256 amount) external override {
        address reward = _rewardOfController(msg.sender);
        ValidatorInfo storage info = _validatorsByReward[reward];

        if (amount == 0) revert InvalidAmount();
        if (info.unbondAmount != 0) revert PendingUnbondExists();
        if (amount > info.stakeVOID) revert InvalidAmount();

        unchecked {
            info.stakeVOID -= amount;
        }

        info.unbondAmount = amount;
        info.unbondReadyAt = block.timestamp + unbondingPeriodSeconds;

        if (info.stakeVOID < minStake) {
            info.active = false;
            info.pendingActivation = false;
            _removeActive(reward);
        }

        if (info.stakeVOID == 0) {
            info.pendingExit = true;
        }

        emit ValidatorUnbondStarted(reward, amount, info.unbondReadyAt);
    }

    function finalizeUnbond() external override {
        address reward = _rewardOfController(msg.sender);
        _finalizeUnbond(reward);
    }

    function beginExit() external override {
        address reward = _rewardOfController(msg.sender);
        ValidatorInfo storage info = _validatorsByReward[reward];

        if (info.unbondAmount != 0) revert PendingUnbondExists();
        if (info.stakeVOID == 0) revert InvalidAmount();

        uint256 fullAmount = info.stakeVOID;
        info.stakeVOID = 0;
        info.unbondAmount = fullAmount;
        info.unbondReadyAt = block.timestamp + unbondingPeriodSeconds;
        info.pendingExit = true;
        info.active = false;
        info.pendingActivation = false;
        _removeActive(reward);

        emit ValidatorUnbondStarted(reward, fullAmount, info.unbondReadyAt);
    }

    function finalizeExit() external override {
        address reward = _rewardOfController(msg.sender);
        ValidatorInfo storage info = _validatorsByReward[reward];
        if (!info.pendingExit) revert InvalidAmount();

        _finalizeUnbond(reward);
        info.pendingExit = false;

        emit ValidatorExited(reward);
    }

    function setRewardAddress(address newReward) external override {
        if (newReward == address(0)) revert ZeroAddress();
        if (_validatorExists(newReward)) revert RewardAlreadyInUse();

        address oldReward = _rewardOfController(msg.sender);
        ValidatorInfo storage oldInfo = _validatorsByReward[oldReward];

        ValidatorInfo memory moved = oldInfo;
        moved.reward = newReward;

        delete _validatorsByReward[oldReward];
        _validatorsByReward[newReward] = moved;
        controllerToReward[msg.sender] = newReward;

        _replaceAddressInArray(_allValidators, oldReward, newReward);
        _replaceAddressInArray(_activeValidators, oldReward, newReward);

        emit ValidatorRewardAddressUpdated(oldReward, newReward);
    }

    function setConsensusKey(bytes32 newConsensusKey) external override {
        if (newConsensusKey == bytes32(0)) revert InvalidConsensusKey();

        address reward = _rewardOfController(msg.sender);
        ValidatorInfo storage info = _validatorsByReward[reward];
        bytes32 oldKey = info.consensusKey;
        info.consensusKey = newConsensusKey;

        emit ValidatorConsensusKeyUpdated(reward, oldKey, newConsensusKey);
    }

    function getValidator(address reward) external view override returns (ValidatorInfo memory) {
        _requireValidatorExists(reward);
        return _validatorsByReward[reward];
    }

    function getActiveValidators()
        external
        view
        override(IValidatorStakingV2, IValidatorTruthSource)
        returns (address[] memory rewards, uint256[] memory stakeVOID_)
    {
        uint256 n = _activeValidators.length;
        rewards = new address[](n);
        stakeVOID_ = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            address reward = _activeValidators[i];
            rewards[i] = reward;
            stakeVOID_[i] = _validatorsByReward[reward].stakeVOID;
        }
    }

    function getActiveValidatorCount() external view override returns (uint256) {
        return _activeValidators.length;
    }

    function getActiveValidatorAt(uint256 index) external view override returns (address reward) {
        return _activeValidators[index];
    }

    function getValidatorTruth(address reward) external view override returns (ValidatorTruth memory) {
        _requireValidatorExists(reward);
        ValidatorInfo storage info = _validatorsByReward[reward];
        return ValidatorTruth({
            reward: info.reward,
            controller: info.controller,
            consensusKey: info.consensusKey,
            stakeVOID: info.stakeVOID,
            active: info.active,
            pendingExit: info.pendingExit,
            jailed: info.jailed
        });
    }

    function isSelectableValidator(address reward) public view override returns (bool) {
        if (!_validatorExists(reward)) return false;
        ValidatorInfo storage info = _validatorsByReward[reward];
        return (
            info.active &&
            !info.pendingExit &&
            !info.jailed &&
            info.stakeVOID >= minStake &&
            info.consensusKey != bytes32(0)
        );
    }

    function effectivePowerOf(address reward) external view override returns (uint256) {
        return isSelectableValidator(reward) ? _validatorsByReward[reward].stakeVOID : 0;
    }

    function getValidatorCount() external view override returns (uint256) {
        return _allValidators.length;
    }

    function isActiveValidator(address reward) external view override returns (bool) {
        return _validatorsByReward[reward].active;
    }

    function stakeOf(address reward) external view override returns (uint256) {
        return _validatorsByReward[reward].stakeVOID;
    }

    function _register(address controller, address reward, bytes32 consensusKey) internal {
        if (reward == address(0)) revert ZeroAddress();
        if (consensusKey == bytes32(0)) revert InvalidConsensusKey();
        if (_validatorExists(reward)) revert ValidatorAlreadyRegistered();
        if (controllerToReward[controller] != address(0)) revert ControllerAlreadyAssigned();

        ValidatorInfo storage info = _validatorsByReward[reward];
        info.reward = reward;
        info.controller = controller;
        info.consensusKey = consensusKey;
        info.stakeVOID = 0;
        info.active = false;
        info.pendingActivation = false;
        info.pendingExit = false;
        info.jailed = false;
        info.unbondAmount = 0;
        info.unbondReadyAt = 0;

        controllerToReward[controller] = reward;
        _allValidators.push(reward);

        emit ValidatorRegistered(reward, controller, consensusKey);
    }

    function _stakeFrom(address from, address reward, uint256 amount) internal {
        if (amount == 0) revert InvalidAmount();
        _requireValidatorExists(reward);

        bool ok = voidToken.transferFrom(from, address(this), amount);
        if (!ok) revert TokenTransferFailed();

        ValidatorInfo storage info = _validatorsByReward[reward];
        info.stakeVOID += amount;

        if (!info.active && info.stakeVOID >= minStake) {
            info.pendingActivation = true;
        }

        emit ValidatorStakeIncreased(reward, amount, info.stakeVOID);
    }

    function _finalizeUnbond(address reward) internal {
        ValidatorInfo storage info = _validatorsByReward[reward];
        uint256 amount = info.unbondAmount;

        if (amount == 0) revert InvalidAmount();
        if (block.timestamp < info.unbondReadyAt) revert UnbondNotReady();

        info.unbondAmount = 0;
        info.unbondReadyAt = 0;

        bool ok = voidToken.transfer(info.controller, amount);
        if (!ok) revert TokenTransferFailed();

        emit ValidatorUnbondFinalized(reward, amount, info.stakeVOID);
    }

    function _rewardOfController(address controller) internal view returns (address reward) {
        reward = controllerToReward[controller];
        if (reward == address(0)) revert NotValidatorController();
    }

    function _requireValidatorExists(address reward) internal view {
        if (!_validatorExists(reward)) revert ValidatorNotFound();
    }

    function _validatorExists(address reward) internal view returns (bool) {
        return _validatorsByReward[reward].controller != address(0);
    }

    function _pushActiveIfMissing(address reward) internal {
        uint256 n = _activeValidators.length;
        for (uint256 i = 0; i < n; i++) {
            if (_activeValidators[i] == reward) return;
        }
        _activeValidators.push(reward);
    }

    function _removeActive(address reward) internal {
        uint256 n = _activeValidators.length;
        for (uint256 i = 0; i < n; i++) {
            if (_activeValidators[i] == reward) {
                _activeValidators[i] = _activeValidators[n - 1];
                _activeValidators.pop();
                return;
            }
        }
    }

    function _replaceAddressInArray(address[] storage arr, address oldAddr, address newAddr) internal {
        uint256 n = arr.length;
        for (uint256 i = 0; i < n; i++) {
            if (arr[i] == oldAddr) {
                arr[i] = newAddr;
                return;
            }
        }
    }
}
