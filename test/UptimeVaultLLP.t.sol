// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {UptimeVaultLLP, IERC20Like, IWorkCreditsTokenLike} from "../contracts/mainnet/UptimeVaultLLP.sol";

contract MockVoidToken is IERC20Like {
    string public constant name = "VoidTokenMock";
    string public constant symbol = "VOIDM";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function _mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 bal = balanceOf[msg.sender];
        require(bal >= value, "VOIDM: balance");
        unchecked {
            balanceOf[msg.sender] = bal - value;
            balanceOf[to] += value;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "VOIDM: allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        uint256 bal = balanceOf[from];
        require(bal >= value, "VOIDM: balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }
}

contract MockWorkCreditsToken is IWorkCreditsTokenLike {
    string public constant name = "WorkCreditsMock";
    string public constant symbol = "WCM";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function _mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 bal = balanceOf[msg.sender];
        require(bal >= value, "WCM: balance");
        unchecked {
            balanceOf[msg.sender] = bal - value;
            balanceOf[to] += value;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "WCM: allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        uint256 bal = balanceOf[from];
        require(bal >= value, "WCM: balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }
}

contract UptimeVaultLLPTest is Test {
    MockVoidToken internal voidToken;
    MockWorkCreditsToken internal wcToken;
    UptimeVaultLLP internal vault;

    // In constructor we start as governance, then hand governance to lpTreasury in setUp.
    address internal gov        = address(this);
    address internal lpTreasury = address(0x4000);
    address internal user       = address(0x5000);

    function setUp() public {
        voidToken = new MockVoidToken();
        wcToken = new MockWorkCreditsToken();

        // Seed some balances to the "LP treasury" that will seed the vault.
        voidToken._mint(lpTreasury, 10_000_000e18);
        wcToken._mint(lpTreasury, 10_000_000e18);

        vault = new UptimeVaultLLP(address(voidToken), address(wcToken), gov);

        // Hand governance over to lpTreasury so tests can act as governance via vm.prank(lpTreasury)
        vault.setGovernance(lpTreasury);

        // Approvals for seeding from lpTreasury
        vm.startPrank(lpTreasury);
        voidToken.approve(address(vault), type(uint256).max);
        wcToken.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    function testSeedLockedLiquidityOnce() public {
        vm.prank(lpTreasury);
        vault.seedLockedLiquidity(10_000_000e18, 10_000_000e18);

        (uint112 rVoid, uint112 rWc) = vault.getReserves();
        assertEq(uint256(rVoid), 10_000_000e18);
        assertEq(uint256(rWc), 10_000_000e18);

        // Second seed should fail
        vm.prank(lpTreasury);
        vm.expectRevert("Vault: already seeded");
        vault.seedLockedLiquidity(1e18, 1e18);
    }

    function testSwapWcForVoid() public {
        // Seed
        vm.prank(lpTreasury);
        vault.seedLockedLiquidity(10_000_000e18, 10_000_000e18);

        // Give user some WC
        wcToken._mint(user, 1_000e18);

        vm.startPrank(user);
        wcToken.approve(address(vault), type(uint256).max);

        uint256 voidBefore = voidToken.balanceOf(user);
        vault.swapWcForVoid(100e18, 0, user); // no slippage check in test
        uint256 voidAfter = voidToken.balanceOf(user);

        vm.stopPrank();

        assertGt(voidAfter, voidBefore, "user should receive VOID");
    }

    function testSwapVoidForWc() public {
        // Seed
        vm.prank(lpTreasury);
        vault.seedLockedLiquidity(10_000_000e18, 10_000_000e18);

        // Give user some VOID
        voidToken._mint(user, 1_000e18);

        vm.startPrank(user);
        voidToken.approve(address(vault), type(uint256).max);

        uint256 wcBefore = wcToken.balanceOf(user);
        vault.swapVoidForWc(100e18, 0, user);
        uint256 wcAfter = wcToken.balanceOf(user);

        vm.stopPrank();

        assertGt(wcAfter, wcBefore, "user should receive WC");
    }

    function testCannotSwapBeforeSeeded() public {
        // user gets tokens but vault not seeded
        wcToken._mint(user, 100e18);
        voidToken._mint(user, 100e18);

        vm.startPrank(user);
        wcToken.approve(address(vault), type(uint256).max);
        voidToken.approve(address(vault), type(uint256).max);

        vm.expectRevert("Vault: not seeded");
        vault.swapWcForVoid(10e18, 0, user);

        vm.expectRevert("Vault: not seeded");
        vault.swapVoidForWc(10e18, 0, user);

        vm.stopPrank();
    }

    function testGovernanceControlsFee() public {
        uint16 oldFee = vault.feeBps();
        assertEq(oldFee, 5);

        // lpTreasury is now governance
        vm.prank(lpTreasury);
        vault.setFeeBps(30);
        assertEq(vault.feeBps(), 30);

        vm.prank(lpTreasury);
        vm.expectRevert("Vault: fee too high");
        vault.setFeeBps(5000);
    }

    function testOnlyGovernanceCanSetFee() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("Vault: not governance");
        vault.setFeeBps(10);
    }

    function testAddLockedLiquidity() public {
        // Seed first
        vm.prank(lpTreasury);
        vault.seedLockedLiquidity(1_000_000e18, 1_000_000e18);

        // top up from treasury (governance)
        vm.prank(lpTreasury);
        vault.addLockedLiquidity(100_000e18, 50_000e18);

        (uint112 rVoid, uint112 rWc) = vault.getReserves();
        assertEq(uint256(rVoid), 1_100_000e18);
        assertEq(uint256(rWc), 1_050_000e18);
    }
}
