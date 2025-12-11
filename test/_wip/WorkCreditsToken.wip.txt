// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsToken} from "../../contracts/workcredits/WorkCreditsToken.sol";

contract WorkCreditsTokenTest is Test {
    WorkCreditsToken internal wc;

    // All of these are valid hex literals (no letters beyond 0-9, a-f).
    address internal controller = address(0xC0FFEE);
    address internal alice      = address(0xA11CE);
    address internal bob        = address(0xB0B);

    function setUp() public {
        wc = new WorkCreditsToken(controller);
    }

    function testInitialController() public {
        assertEq(wc.controller(), controller);
    }

    function testControllerMintAndTransfer() public {
        vm.prank(controller);
        wc.mint(alice, 1e18);

        assertEq(wc.totalSupply(), 1e18);
        assertEq(wc.balanceOf(alice), 1e18);

        vm.prank(alice);
        wc.transfer(bob, 0.4e18);

        assertEq(wc.balanceOf(alice), 0.6e18);
        assertEq(wc.balanceOf(bob), 0.4e18);
    }

    function testOnlyControllerCanMint() public {
        vm.expectRevert(WorkCreditsToken.NotController.selector);
        wc.mint(alice, 1e18);
    }

    function testApproveAndTransferFrom() public {
        vm.prank(controller);
        wc.mint(alice, 1e18);

        vm.prank(alice);
        wc.approve(bob, 0.5e18);

        vm.prank(bob);
        wc.transferFrom(alice, bob, 0.5e18);

        assertEq(wc.balanceOf(alice), 0.5e18);
        assertEq(wc.balanceOf(bob), 0.5e18);
        assertEq(wc.allowance(alice, bob), 0);
    }

    function testTransferFromRevertsOnInsufficientAllowance() public {
        vm.prank(controller);
        wc.mint(alice, 1e18);

        vm.prank(alice);
        wc.approve(bob, 0.2e18);

        vm.prank(bob);
        vm.expectRevert(WorkCreditsToken.InsufficientAllowance.selector);
        wc.transferFrom(alice, bob, 0.3e18);
    }

    function testSetController() public {
        address newController = address(0xBEEF);

        vm.prank(controller);
        wc.setController(newController);

        assertEq(wc.controller(), newController);
    }

    function testSetControllerOnlyController() public {
        vm.expectRevert(WorkCreditsToken.NotController.selector);
        wc.setController(address(0x1));
    }

    function testSetControllerZeroReverts() public {
        vm.prank(controller);
        vm.expectRevert(WorkCreditsToken.ZeroAddress.selector);
        wc.setController(address(0));
    }

    function testBurn() public {
        vm.prank(controller);
        wc.mint(alice, 1e18);

        vm.prank(controller);
        wc.burn(alice, 0.25e18);

        assertEq(wc.balanceOf(alice), 0.75e18);
        assertEq(wc.totalSupply(), 0.75e18);
    }

    function testBurnRevertsOnInsufficientBalance() public {
        vm.prank(controller);
        wc.mint(alice, 1e18);

        vm.prank(controller);
        vm.expectRevert(WorkCreditsToken.InsufficientBalance.selector);
        wc.burn(alice, 2e18);
    }
}
