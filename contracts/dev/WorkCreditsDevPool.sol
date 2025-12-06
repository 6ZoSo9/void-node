// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal ERC20 interface for reserve reads.
interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
}

/// @dev Devnet-only "pool" used for monitoring WC/VOID reserves.
/// This is NOT a production AMM. It simply holds balances:
/// - VOID token at `voidToken`
/// - WorkCredits token at `workCreditsToken`
///
/// The exporter can treat the balances of these tokens on this contract
/// as "reserves" for price/health metrics.
contract WorkCreditsDevPool {
    address public immutable voidToken;
    address public immutable workCreditsToken;

    constructor(address _voidToken, address _workCreditsToken) {
        require(_voidToken != address(0), "WorkCreditsDevPool: voidToken=0");
        require(_workCreditsToken != address(0), "WorkCreditsDevPool: workCreditsToken=0");
        voidToken = _voidToken;
        workCreditsToken = _workCreditsToken;
    }

    /// @notice Helper for debugging and tests.
    function getReserves() external view returns (uint256 voidReserve, uint256 wcReserve) {
        voidReserve = IERC20Minimal(voidToken).balanceOf(address(this));
        wcReserve = IERC20Minimal(workCreditsToken).balanceOf(address(this));
    }
}
