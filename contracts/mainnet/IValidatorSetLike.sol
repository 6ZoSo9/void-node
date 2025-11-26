// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @dev Minimal view of the validator set that the reward engine needs.
interface IValidatorSetLike {
    /// @notice Returns the list of active validator addresses.
    function getActiveValidators() external view returns (address[] memory);

    /// @notice Returns the voting power / weight for a validator.
    /// @dev MUST return 0 for non-validators.
    function getVotingPower(address validator) external view returns (uint256);
}
