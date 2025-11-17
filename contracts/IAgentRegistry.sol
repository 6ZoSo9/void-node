// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.0;

/// @notice Minimal agent interface for VOID tests/helpers.
/// @dev This intentionally does NOT use the same name/signature as the
///      richer on-chain IAgentRegistry inside ReceiptRegistry.sol.
interface IVoidAgentSimple {
    function isAgent(address who) external view returns (bool);
}
