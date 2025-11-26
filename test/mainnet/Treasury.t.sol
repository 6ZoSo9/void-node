// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {IVoidTokenLike} from "../../contracts/mainnet/IVoidTokenLike.sol";
import {VoidTreasury} from "../../contracts/mainnet/VoidTreasury.sol";
import {OpsTreasury} from "../../contracts/mainnet/OpsTreasury.sol";

/// @dev Extremely simple token used just for treasury tests.
contract MockVoidToken is IVoidTokenLike {
    string public constant name = "Mock VOID";
    string public constant symbol = "mVOID";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function transfer(address to, uint256 amount) external override returns (bool) {
        address from = msg.sender;
        uint256 bal = balanceOf[from];
        require(bal >= amount, "insufficient");
        unchecked {
            balanceOf[from] = bal - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract TreasuryTest is Test {
    MockVoidToken internal token;
    VoidTreasury internal voidTreasury;
    OpsTreasury internal opsTreasury;

    address internal admin = address(0xA11CE);
    address internal nonAdmin = address(0xBEEF);
    address internal vendor = address(0x1111111111111111111111111111111111111111);

    function setUp() public {
        token = new MockVoidToken();
        opsTreasury = new OpsTreasury(IVoidTokenLike(address(token)), admin);
        voidTreasury = new VoidTreasury(IVoidTokenLike(address(token)), address(opsTreasury), admin);

        // Seed premine into the cold treasury.
        token.mint(address(voidTreasury), 1_000_000 ether);
    }

    function testOnlyAdminCanSendToOps() public {
        // Non-admin should revert.
        vm.prank(nonAdmin);
        vm.expectRevert(VoidTreasury.NotAdmin.selector);
        voidTreasury.sendToOps(100 ether, bytes32("ops-spend"));
    }

    function testSendToOpsMovesFunds() public {
        uint256 beforeOps = token.balanceOf(address(opsTreasury));

        vm.prank(admin);
        voidTreasury.sendToOps(100 ether, bytes32("ops-spend"));

        uint256 afterOps = token.balanceOf(address(opsTreasury));
        assertEq(afterOps - beforeOps, 100 ether, "ops should receive 100");
    }

    function testOpsTreasuryOnlyAdminCanSpend() public {
        // Move some funds from VoidTreasury -> OpsTreasury first.
        vm.prank(admin);
        voidTreasury.sendToOps(1_000 ether, bytes32("seed-ops"));

        // Non-admin spend should revert.
        vm.prank(nonAdmin);
        vm.expectRevert(OpsTreasury.NotAdmin.selector);
        opsTreasury.spend(vendor, 10 ether, bytes32("bad-spend"));
    }

    function testOpsTreasurySpendFlow() public {
        // Seed OpsTreasury.
        vm.prank(admin);
        voidTreasury.sendToOps(1_000 ether, bytes32("seed-ops"));

        uint256 beforeVendor = token.balanceOf(vendor);

        vm.prank(admin);
        opsTreasury.spend(vendor, 123 ether, bytes32("vendor-payment"));

        uint256 afterVendor = token.balanceOf(vendor);
        assertEq(afterVendor - beforeVendor, 123 ether, "vendor should receive 123");
    }
}
