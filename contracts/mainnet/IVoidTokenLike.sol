// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Minimal VOID token view the treasuries care about.
/// @dev We keep this tiny on purpose. If you already have a richer VoidToken
///      interface, you can swap this import to point at that later.
interface IVoidTokenLike {
    function transfer(address to, uint256 amount) external returns (bool);
}
