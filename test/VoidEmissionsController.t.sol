// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/VoidEmissionsController.sol";

contract VoidEmissionsControllerTest is Test {
    VoidEmissionsController ctrl;

    function setUp() public {
        ctrl = new VoidEmissionsController(address(this));
    }

    function testConstantsMatchSpec() public view {
        // Per-era budgets
        assertEq(ctrl.ERA1_BUDGET(), 177_777_777 * 1e18, "era1");
        assertEq(ctrl.ERA2_BUDGET(), 88_888_889 * 1e18, "era2");
        assertEq(ctrl.ERA3_BUDGET(), 44_444_444 * 1e18, "era3");
        assertEq(ctrl.ERA4_BUDGET(), 22_222_223 * 1e18, "era4");

        // Global budget
        uint256 expected = (177_777_777 + 88_888_889 + 44_444_444 + 22_222_223) * 1e18;
        assertEq(ctrl.EMISSIONS_BUDGET(), expected, "emissionsBudget");
    }

    function testConsumeWithinEraBudget() public {
        uint8 era = 1;
        uint256 amount = ctrl.ERA1_BUDGET();

        ctrl.consumeEmission(era, amount);

        assertEq(ctrl.mintedByEra(era), amount);
        assertEq(ctrl.totalEmitted(), amount);
        assertEq(ctrl.remainingInEra(era), 0);
    }

    function testConsumeZeroIsNoop() public {
        ctrl.consumeEmission(1, 0);
        assertEq(ctrl.mintedByEra(1), 0);
        assertEq(ctrl.totalEmitted(), 0);
    }

    function testEraBudgetExceededReverts() public {
        uint8 era = 2;
        uint256 budget = ctrl.ERA2_BUDGET();

        // First, consume almost all of the era budget
        uint256 almostAll = budget - 1;
        ctrl.consumeEmission(era, almostAll);
        assertEq(ctrl.mintedByEra(era), almostAll);

        // Now going over the era budget must revert (we don't care which error fires,
        // just that the guardrail trips).
        vm.expectRevert();
        ctrl.consumeEmission(era, 2);
    }

    function testGlobalBudgetGuardOnceAllErasUsed() public {
        // Consume full budget in all eras
        ctrl.consumeEmission(1, ctrl.ERA1_BUDGET());
        ctrl.consumeEmission(2, ctrl.ERA2_BUDGET());
        ctrl.consumeEmission(3, ctrl.ERA3_BUDGET());
        ctrl.consumeEmission(4, ctrl.ERA4_BUDGET());

        // At this point we've hit the global emissions budget
        assertEq(ctrl.totalEmitted(), ctrl.EMISSIONS_BUDGET());
        assertEq(ctrl.remainingGlobal(), 0);

        // Any further emission from any era must revert
        vm.expectRevert();
        ctrl.consumeEmission(4, 1);
    }

    function testOnlyAdminCanConsume() public {
        // Change admin to some other address
        address newAdmin = address(0xBEEF);
        ctrl.setAdmin(newAdmin);

        // Call from non-admin should revert
        vm.expectRevert();
        ctrl.consumeEmission(1, 1e18);

        // Call from new admin should succeed
        vm.prank(newAdmin);
        ctrl.consumeEmission(1, 1e18);
        assertEq(ctrl.mintedByEra(1), 1e18);
    }

    function testInvalidEraReverts() public {
        vm.expectRevert();
        ctrl.consumeEmission(0, 1e18);

        vm.expectRevert();
        ctrl.consumeEmission(5, 1e18);
    }
}
