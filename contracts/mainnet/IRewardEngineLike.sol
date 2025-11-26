// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IVoidTokenLike} from "./IVoidTokenLike.sol";
import {IValidatorSetLike} from "./IValidatorSetLike.sol";

/// @dev Minimal interface for the reward engine that manages emissions and validator claims.
interface IRewardEngineLike {
    /// @notice VOID token used for rewards.
    function token() external view returns (IVoidTokenLike);

    /// @notice Validator set used to determine who is eligible for rewards.
    function validatorSet() external view returns (IValidatorSetLike);

    /// @notice Admin address allowed to pull emissions / manage parameters.
    function admin() external view returns (address);

    /// @notice Total amount of VOID emitted so far (18 decimals).
    function totalEmitted() external view returns (uint256);

    /// @notice Maximum emission budget (333,333,333 * 1e18).
    function emissionsBudget() external view returns (uint256);

    /// @notice Pulls an emission chunk into the engine's accounting.
    /// @dev Must revert if this would push totalEmitted above emissionsBudget().
    function pullEmission(uint256 amount) external;

    /// @notice Returns claimable amount for a validator.
    function claimable(address validator) external view returns (uint256);

    /// @notice Claim rewards for the caller (validator).
    function claim() external returns (uint256);
}
