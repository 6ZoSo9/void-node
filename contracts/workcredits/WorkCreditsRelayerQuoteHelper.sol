// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./WorkCreditsQuoteLib.sol";

/// @dev Minimal interface for a WC/VOID constant-product pool used by the quote helper.
///      Your real LLP can either implement this directly or be wrapped by an adapter.
interface IWCVoidPoolReserves {
    /// @return reserveWC   WC reserve in the pool
    /// @return reserveVOID VOID reserve in the pool
    function getReservesWCVOID() external view returns (uint256 reserveWC, uint256 reserveVOID);

    /// @return feeBps Swap fee in basis points (e.g. 30 = 0.30%)
    function feeBps() external view returns (uint256);
}

/// @title WorkCreditsRelayerQuoteHelper
/// @notice View-only helper: "How much WC do I need to get X VOID from the pool?"
contract WorkCreditsRelayerQuoteHelper {
    using WorkCreditsQuoteLib for uint256;

    IWCVoidPoolReserves public immutable pool;

    struct Quote {
        uint256 wcFee;          // WC user must pay (pre-fee)
        uint256 wcFeeAfterFee;  // WC that actually enters pool after fee
        uint256 reserveWC;      // current WC reserve
        uint256 reserveVOID;    // current VOID reserve
        uint256 voidNeeded;     // requested VOID output
        uint256 feeBps;         // pool fee in bps
    }

    constructor(IWCVoidPoolReserves _pool) {
        pool = _pool;
    }

    /// @notice Quote WC fee for a desired VOID amount.
    /// @param voidNeeded Desired VOID output (gas + relayer margin + buffer).
    function quoteForVoid(uint256 voidNeeded) external view returns (Quote memory q) {
        (uint256 reserveWC, uint256 reserveVOID) = pool.getReservesWCVOID();
        uint256 fee = pool.feeBps();

        (uint256 wcIn, uint256 wcInAfterFee) = WorkCreditsQuoteLib.quoteWCFee(
            voidNeeded,
            reserveWC,
            reserveVOID,
            fee
        );

        q = Quote({
            wcFee: wcIn,
            wcFeeAfterFee: wcInAfterFee,
            reserveWC: reserveWC,
            reserveVOID: reserveVOID,
            voidNeeded: voidNeeded,
            feeBps: fee
        });
    }
}
