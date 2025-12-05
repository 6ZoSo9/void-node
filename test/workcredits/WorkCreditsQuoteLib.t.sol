// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsQuoteLib} from "../../contracts/workcredits/WorkCreditsQuoteLib.sol";

contract WorkCreditsQuoteLibHarness {
    function callQuote(
        uint256 voidNeeded,
        uint256 reserveWC,
        uint256 reserveVOID,
        uint256 feeBps
    ) external pure returns (uint256 wcIn, uint256 wcInAfterFee) {
        return WorkCreditsQuoteLib.quoteWCFee(voidNeeded, reserveWC, reserveVOID, feeBps);
    }
}

contract WorkCreditsQuoteLibTest is Test {
    WorkCreditsQuoteLibHarness internal harness;

    function setUp() public {
        harness = new WorkCreditsQuoteLibHarness();
    }

    function testQuoteProducesEnoughVOID() public {
        // Toy reserves: deep pool with modest fee.
        uint256 reserveWC   = 1_000_000e18;
        uint256 reserveVOID =    10_000e18;
        uint256 feeBps      = 30;          // 0.30%
        uint256 voidNeeded  =       10e18; // pretend this is gas+margin

        (uint256 wcIn, uint256 wcInAfterFee) = WorkCreditsQuoteLib.quoteWCFee(
            voidNeeded,
            reserveWC,
            reserveVOID,
            feeBps
        );

        // Simulate the constant-product swap with the quoted input.
        uint256 wcInAfterFeeSim = wcIn * (10_000 - feeBps) / 10_000;
        assertGe(wcInAfterFeeSim, wcInAfterFee, "simulated fee should be >= returned after-fee");

        uint256 voidOut = (reserveVOID * wcInAfterFeeSim) / (reserveWC + wcInAfterFeeSim);

        assertGe(voidOut, voidNeeded, "quote does not buy enough VOID");
        // For this setup we expect small overshoot (we're rounding up).
        assertLt(voidOut - voidNeeded, voidNeeded / 10, "overshoot too large");
    }

    function testRevertsIfTooMuchOfPool() public {
        uint256 reserveWC   = 1_000_000e18;
        uint256 reserveVOID =    10_000e18;
        uint256 feeBps      = 30;

        // Ask for 20% of the VOID pool in one shot (we cap at 10%).
        uint256 voidNeeded = (reserveVOID * 2_000) / 10_000; // 20%

        vm.expectRevert(WorkCreditsQuoteLib.ExcessiveShareOfPool.selector);

        // This is an external call, so the revert happens at a lower depth
        // than the cheatcode and Foundry is happy.
        harness.callQuote(voidNeeded, reserveWC, reserveVOID, feeBps);
    }
}
