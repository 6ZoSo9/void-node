// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IValidatorSetLike} from "./IValidatorSetLike.sol";

/// @title ValidatorSet
/// @notice Minimal admin-controlled validator set for VOID mainnet v1.
///         - Tracks voting power per validator.
///         - Implements IValidatorSetLike (getActiveValidators + getVotingPower).
///         - Exposes totalPower() and powerOf() as convenience helpers.
contract ValidatorSet is IValidatorSetLike {
    /// @notice Admin with authority to update validator powers and rotate admin.
    address public admin;

    /// @dev voting power per validator address
    mapping(address => uint256) private _power;

    /// @dev list of all validators ever added (we do not compact on zeroing)
    address[] private _validators;

    /// @dev simple presence flag; we allow zero power but keep them in the list
    mapping(address => bool) private _inSet;

    /// @dev cached sum of all validator powers
    uint256 private _totalPower;

    /// @dev thrown when a non-admin calls an admin-only function
    error NotAdmin();

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event ValidatorPowerUpdated(address indexed validator, uint256 oldPower, uint256 newPower);

    constructor(address _admin) {
        require(_admin != address(0), "admin=0");
        admin = _admin;
        emit AdminChanged(address(0), _admin);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @notice Rotate admin to a new address.
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "admin=0");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice Set or update the voting power of a validator.
    /// @dev Setting power to 0 effectively removes their weight, but keeps them in the list.
    function setValidatorPower(address validator, uint256 newPower) external onlyAdmin {
        require(validator != address(0), "validator=0");

        uint256 oldPower = _power[validator];

        // First time we see this validator, track it in the list.
        if (!_inSet[validator]) {
            _inSet[validator] = true;
            _validators.push(validator);
        }

        _power[validator] = newPower;

        // Update total power (safe because we track the delta).
        if (newPower >= oldPower) {
            _totalPower += (newPower - oldPower);
        } else {
            _totalPower -= (oldPower - newPower);
        }

        emit ValidatorPowerUpdated(validator, oldPower, newPower);
    }

    // ------------------------------------------------------------------------
    // IValidatorSetLike implementation
    // ------------------------------------------------------------------------

    /// @inheritdoc IValidatorSetLike
    /// @notice Returns only validators with non-zero voting power.
    function getActiveValidators() external view override returns (address[] memory) {
        uint256 len = _validators.length;
        uint256 count;

        // First pass: count non-zero power validators.
        for (uint256 i = 0; i < len; i++) {
            if (_power[_validators[i]] != 0) {
                unchecked {
                    ++count;
                }
            }
        }

        // Allocate array of exact size.
        address[] memory actives = new address[](count);
        uint256 idx;

        // Second pass: fill active validators.
        for (uint256 i = 0; i < len; i++) {
            address v = _validators[i];
            if (_power[v] != 0) {
                actives[idx] = v;
                unchecked {
                    ++idx;
                }
            }
        }

        return actives;
    }

    /// @inheritdoc IValidatorSetLike
    function getVotingPower(address validator) external view override returns (uint256) {
        return _power[validator];
    }

    // ------------------------------------------------------------------------
    // Convenience helpers (NOT part of IValidatorSetLike)
    // ------------------------------------------------------------------------

    /// @notice Total voting power across all validators.
    function totalPower() external view returns (uint256) {
        return _totalPower;
    }

    /// @notice Alias to getVotingPower for convenience.
    function powerOf(address validator) external view returns (uint256) {
        return _power[validator];
    }

    /// @notice Snapshot of all validators and their current powers.
    /// @dev Includes zero-power entries; consumers should ignore zeros if they only care about active validators.
    function getValidators() external view returns (address[] memory validators, uint256[] memory powers) {
        uint256 len = _validators.length;
        validators = new address[](len);
        powers = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            address v = _validators[i];
            validators[i] = v;
            powers[i] = _power[v];
        }
    }
}
