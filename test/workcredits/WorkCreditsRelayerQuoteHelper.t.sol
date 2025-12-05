// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsQuoteLib} from "../../contracts/workcredits/WorkCreditsQuoteLib.sol";
import {
    IWCVoidPoolReserves,
    WorkCreditsRelayerQuoteHelper
} from "../../contracts/workcredits/WorkCreditsRelayerQuoteHelper.sol";

/// @dev Dummy in-memory pool for testing the helper.
contract DummyWCVoidPool is IWCVoidPoolReserves {
    uint256 internal _reserveWC;
    uint256 internal _reserveVOID;
    uint256 internal _feeBps;

    constructor(uint256 reserveWC, uint256 reserveVOID, uint256 feeBps) {
        _reserveWC = reserveWC;
        _reserveVOID = reserveVOID;
        _feeBps = feeBps;
    }

    function getReservesWCVOID() external view override returns (uint256 reserveWC, uint256 reserveVOID) {
        reserveWC = _reserveWC;
        reserveVOID = _reserveVOID;
    }

    function feeBps() external view override returns (uint256) {
        return _feeBps;
    }
}

contract WorkCreditsRelayerQuoteHelperTest is Test {
    DummyWCVoidPool internal pool;
    WorkCreditsRelayerQuoteHelper internal helper;

    function setUp() public {
        // Same toy reserves as the lib test: deep pool with modest fee.
        uint256 reserveWC   = 1_000_000e18;
        uint256 reserveVOID =    10_000e18;
        uint256 feeBps      = 30; // 0.30%

        pool = new DummyWCVoidPool(reserveWC, reserveVOID, feeBps);
        helper = new WorkCreditsRelayerQuoteHelper(pool);
    }

    function testHelperQuoteMatchesDirectLibMath() public {
        uint256 voidNeeded = 10e18;

        WorkCreditsRelayerQuoteHelper.Quote memory q = helper.quoteForVoid(voidNeeded);

        // Simulate swap with quoted wcFee and ensure we get >= voidNeeded.
        uint256 wcInAfterFeeSim = q.wcFee * (10_000 - q.feeBps) / 10_000;
        uint256 voidOut = (q.reserveVOID * wcInAfterFeeSim) / (q.reserveWC + wcInAfterFeeSim);

        assertGe(voidOut, q.voidNeeded, "helper quote does not buy enough VOID");
    }

    function testHelperRevertsIfTooMuchOfPool() public {
        (, uint256 reserveVOID) = pool.getReservesWCVOID();

        // Ask for 20% of VOID pool; lib caps at 10%.
        uint256 voidNeeded = (reserveVOID * 2_000) / 10_000; // 20%

        vm.expectRevert(WorkCreditsQuoteLib.ExcessiveShareOfPool.selector);
        helper.quoteForVoid(voidNeeded);
    }
}
