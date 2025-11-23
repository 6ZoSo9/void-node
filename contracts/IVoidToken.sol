// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for the VOID token (VoidStones).
/// Must be implemented by your existing VoidToken.sol.
interface IVoidToken {
    function totalSupply() external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function decimals() external view returns (uint8);

    /// @notice Mint new VoidStones to `to`.
    /// Must be restricted in the token to authorized controllers only.
    function mint(address to, uint256 amount) external;
}
