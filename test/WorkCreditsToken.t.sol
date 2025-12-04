// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsToken} from "../contracts/mainnet/WorkCreditsToken.sol";

contract WorkCreditsTokenTest is Test {
    WorkCreditsToken internal wc;
    address internal gov    = address(0x1000);
    address internal minter = address(0x2000);
    address internal user   = address(0x3000);

    function setUp() public {
        vm.prank(gov);
        wc = new WorkCreditsToken(gov);
    }

    function testInitialGovernance() public {
        assertEq(wc.governance(), gov);
        assertEq(wc.minter(), address(0));
        assertEq(wc.totalSupply(), 0);
    }

    function testSetMinterOnlyGovernance() public {
        vm.expectRevert("WC: not governance");
        wc.setMinter(minter);

        vm.prank(gov);
        wc.setMinter(minter);
        assertEq(wc.minter(), minter);
    }

    function testMintByMinter() public {
        vm.prank(gov);
        wc.setMinter(minter);

        vm.prank(minter);
        wc.mint(user, 1e18);

        assertEq(wc.totalSupply(), 1e18);
        assertEq(wc.balanceOf(user), 1e18);
    }

    function testMintRevertsIfNotMinter() public {
        vm.expectRevert("WC: not minter");
        wc.mint(user, 1e18);
    }

    function testBurnFromByMinter() public {
        vm.startPrank(gov);
        wc.setMinter(minter);
        vm.stopPrank();

        vm.prank(minter);
        wc.mint(user, 5e18);

        vm.prank(minter);
        wc.burnFrom(user, 2e18);

        assertEq(wc.totalSupply(), 3e18);
        assertEq(wc.balanceOf(user), 3e18);
    }

    function testBurnFromRevertsIfNotAuthorized() public {
        vm.prank(gov);
        wc.setMinter(minter);

        vm.prank(minter);
        wc.mint(user, 1e18);

        vm.expectRevert("WC: not burn auth");
        wc.burnFrom(user, 1e18);
    }

    function testTransferFlow() public {
        vm.prank(gov);
        wc.setMinter(minter);

        vm.prank(minter);
        wc.mint(user, 10e18);

        address receiver = address(0xBEEF);

        vm.prank(user);
        wc.transfer(receiver, 4e18);

        assertEq(wc.balanceOf(user), 6e18);
        assertEq(wc.balanceOf(receiver), 4e18);
    }

    function testTransferFromFlow() public {
        vm.prank(gov);
        wc.setMinter(minter);

        vm.prank(minter);
        wc.mint(user, 10e18);

        address spender = address(0x4001);

        vm.prank(user);
        wc.approve(spender, 7e18);

        vm.prank(spender);
        wc.transferFrom(user, spender, 7e18);

        assertEq(wc.balanceOf(user), 3e18);
        assertEq(wc.balanceOf(spender), 7e18);
    }
}
