// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ValidatorSet} from "../../contracts/mainnet/ValidatorSet.sol";

contract ValidatorSetTest is Test {
    ValidatorSet internal set;

    address internal admin    = address(0xA11CE);
    address internal nonAdmin = address(0xBEEF);
    address internal val1     = address(0x1111);
    address internal val2     = address(0x2222);

    function setUp() public {
        set = new ValidatorSet(admin);
    }

    function testOnlyAdminCanSetValidatorPower() public {
        vm.prank(nonAdmin);
        vm.expectRevert(ValidatorSet.NotAdmin.selector);
        set.setValidatorPower(val1, 100);
    }

    function testTotalPowerTracksSum() public {
        // admin sets two validators
        vm.prank(admin);
        set.setValidatorPower(val1, 100);
        vm.prank(admin);
        set.setValidatorPower(val2, 50);

        uint256 total = set.totalPower();
        assertEq(total, 150, "totalPower should be 150");

        // decrease val1 power
        vm.prank(admin);
        set.setValidatorPower(val1, 80); // -20

        uint256 total2 = set.totalPower();
        assertEq(total2, 130, "totalPower should update when power changes");
    }

    function testVotingPowerReflectsUpdates() public {
        vm.prank(admin);
        set.setValidatorPower(val1, 42);
        assertEq(set.getVotingPower(val1), 42, "getVotingPower should match");
        // convenience alias
        assertEq(set.powerOf(val1), 42, "powerOf alias should match");

        vm.prank(admin);
        set.setValidatorPower(val1, 0);
        assertEq(set.getVotingPower(val1), 0, "getVotingPower should be zero after removal");
    }

    function testAdminCanBeRotated() public {
        vm.prank(admin);
        set.setAdmin(nonAdmin);

        // Old admin should no longer have rights
        vm.prank(admin);
        vm.expectRevert(ValidatorSet.NotAdmin.selector);
        set.setValidatorPower(val1, 10);

        // New admin can update
        vm.prank(nonAdmin);
        set.setValidatorPower(val1, 10);
        assertEq(set.getVotingPower(val1), 10, "new admin should be able to set power");
    }

    function testGetActiveValidatorsFiltersZeroPower() public {
        vm.prank(admin);
        set.setValidatorPower(val1, 10);
        vm.prank(admin);
        set.setValidatorPower(val2, 0);

        address[] memory actives = set.getActiveValidators();
        assertEq(actives.length, 1, "only one active validator expected");
        assertEq(actives[0], val1, "val1 should be the only active validator");
    }

    function testGetValidatorsReturnsSnapshotIncludingZeros() public {
        vm.prank(admin);
        set.setValidatorPower(val1, 10);
        vm.prank(admin);
        set.setValidatorPower(val2, 0);

        (address[] memory vals, uint256[] memory powers) = set.getValidators();
        assertEq(vals.length, 2, "two validators expected");
        assertEq(powers.length, 2, "two power entries expected");

        // Order is insertion order
        assertEq(vals[0], val1);
        assertEq(powers[0], 10);
        assertEq(vals[1], val2);
        assertEq(powers[1], 0);
    }
}
