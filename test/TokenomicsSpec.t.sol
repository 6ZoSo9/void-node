// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Foundry's standard Test helpers
import "forge-std/Test.sol";

/// @notice This is a pure spec test that encodes the locked
///         VOID mainnet allocation/emissions numbers in code.
///         It does NOT depend on any contracts yet.
///         If we ever change these, the tests should fail.
contract TokenomicsSpec is Test {
    // ----- Canonical VOID (VoidStones) supply numbers -----

    // Full hard cap: 666,666,666 VOID
    uint256 constant MAX_SUPPLY_VOID = 666_666_666;

    // Premine & emissions split (both in VOID, not wei)
    uint256 constant PREMINE_VOID = 333_333_333;
    uint256 constant EMISSIONS_VOID = 333_333_333;

    // Premine buckets (section 1.1)
    uint256 constant FOUNDER_TRUST_VOID = 230_000_000;
    uint256 constant ECOSYSTEM_RES_VOID = 70_000_000;
    uint256 constant COMMUNITY_LP_VOID = 33_333_333;

    // Emission era totals (section 2)
    uint256 constant ERA1_VOID = 177_777_777;
    uint256 constant ERA2_VOID = 88_888_889;
    uint256 constant ERA3_VOID = 44_444_444;
    uint256 constant ERA4_VOID = 22_222_223;

    // ----- Basic invariants -----

    function testPreminePlusEmissionsEqualsMaxSupply() public pure {
        uint256 total = PREMINE_VOID + EMISSIONS_VOID;
        assertEq(total, MAX_SUPPLY_VOID, "premine + emissions must equal hard cap");
    }

    function testPremineBucketsSumCorrectly() public pure {
        uint256 premineBuckets = FOUNDER_TRUST_VOID + ECOSYSTEM_RES_VOID + COMMUNITY_LP_VOID;

        assertEq(premineBuckets, PREMINE_VOID, "premine buckets must sum to premine total");
    }

    function testEmissionErasSumCorrectly() public pure {
        uint256 eraTotal = ERA1_VOID + ERA2_VOID + ERA3_VOID + ERA4_VOID;

        assertEq(eraTotal, EMISSIONS_VOID, "emission eras must sum to emissions total");
    }

    function testBasicPercentSanity() public pure {
        // These are sanity checks; we don't care about exact floating point
        // percentages here, just rough bounds that match the doc.

        // Premine + emissions each 50% of max
        assertEq(PREMINE_VOID * 2, MAX_SUPPLY_VOID, "premine should be 50%");
        assertEq(EMISSIONS_VOID * 2, MAX_SUPPLY_VOID, "emissions should be 50%");

        // Founder trust should be ~69% of premine; integer comparison only:
        // 0.68 < 230/333.333... < 0.70
        uint256 num = FOUNDER_TRUST_VOID * 1000; // scale by 1000
        uint256 den = PREMINE_VOID;
        uint256 bp = num / den; // "per-thousand" approx

        assertTrue(bp > 680, "founder trust should be > 68% of premine");
        assertTrue(bp < 700, "founder trust should be < 70% of premine");
    }
}
