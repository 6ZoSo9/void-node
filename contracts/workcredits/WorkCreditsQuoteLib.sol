// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WorkCreditsQuoteLib
/// @notice Pure math for quoting how much WC is needed to buy a given amount of VOID
///         from a constant-product WC/VOID pool (Uniswap v2 style).
library WorkCreditsQuoteLib {
    uint256 internal constant BPS_DENOM = 10_000;
    // Max % of VOID reserve one quote is allowed to try to pull (here: 10%).
    uint256 internal constant MAX_POOL_FRACTION_BPS = 1_000; // 10%

    error InvalidFee();
    error InsufficientLiquidity();
    error ExcessiveShareOfPool();

    /// @notice Quote required WC input (and post-fee WC) to obtain at least `voidNeeded` VOID
    /// @param voidNeeded   Desired VOID output amount
    /// @param reserveWC    Current WC reserve in the pool
    /// @param reserveVOID  Current VOID reserve in the pool
    /// @param feeBps       Swap fee in basis points (e.g., 30 = 0.30%)
    /// @return wcIn        WC the user must pay (pre-fee)
    /// @return wcInAfterFee Effective WC that actually enters the invariant after fee
    function quoteWCFee(
        uint256 voidNeeded,
        uint256 reserveWC,
        uint256 reserveVOID,
        uint256 feeBps
    ) internal pure returns (uint256 wcIn, uint256 wcInAfterFee) {
        if (feeBps >= BPS_DENOM) revert InvalidFee();
        if (voidNeeded == 0) {
            return (0, 0);
        }
        if (reserveWC == 0 || reserveVOID == 0) revert InsufficientLiquidity();
        if (voidNeeded >= reserveVOID) revert InsufficientLiquidity();

        // Per-tx max share of pool: at most 10% of VOID reserves.
        uint256 maxVoidOut = (reserveVOID * MAX_POOL_FRACTION_BPS) / BPS_DENOM;
        if (voidNeeded > maxVoidOut) revert ExcessiveShareOfPool();

        // Uniswap v2-style constant product:
        // out = (R_void * in_after_fee) / (R_wc + in_after_fee)
        //
        // Solve for in_after_fee such that out >= voidNeeded:
        // in_after_fee >= voidNeeded * R_wc / (R_void - voidNeeded)
        uint256 numerator = voidNeeded * reserveWC;
        uint256 denominator = reserveVOID - voidNeeded;

        // ceil(numerator / denominator)
        uint256 wcInAfterFee_ = (numerator + denominator - 1) / denominator;

        // Apply fee inversion:
        // in_after_fee = in * (1 - f) = in * (BPS_DENOM - feeBps) / BPS_DENOM
        // => in = ceil(in_after_fee * BPS_DENOM / (BPS_DENOM - feeBps))
        uint256 feeDenom = BPS_DENOM - feeBps;
        uint256 wcIn_ = (wcInAfterFee_ * BPS_DENOM + feeDenom - 1) / feeDenom;

        return (wcIn_, wcInAfterFee_);
    }
}
