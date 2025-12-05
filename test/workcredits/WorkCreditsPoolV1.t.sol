// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsPoolV1} from "../../contracts/workcredits/WorkCreditsPoolV1.sol";

// Top-level mock ERC20 for testing (cannot be nested in another contract).
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "ALLOWANCE");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "BALANCE");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract WorkCreditsPoolV1Test is Test {
    MockERC20 internal voidToken;
    MockERC20 internal wcToken;
    WorkCreditsPoolV1 internal pool;

    address internal treasury = address(0xBEEF);
    address internal trader = address(0xCAFE);

    function setUp() public {
        voidToken = new MockERC20("VOID", "VOID");
        wcToken = new MockERC20("VOID Work Credits", "WC");

        pool = new WorkCreditsPoolV1(address(voidToken), address(wcToken), treasury);

        // Seed balances to treasury for initial seed
        voidToken.mint(treasury, 1_000 ether);
        wcToken.mint(treasury, 100 ether);

        // Treasury approves pool for seeding
        vm.prank(treasury);
        voidToken.approve(address(pool), type(uint256).max);
        vm.prank(treasury);
        wcToken.approve(address(pool), type(uint256).max);

        // Seed pool with 1000 VOID / 100 WC
        vm.prank(treasury);
        pool.seed(1_000 ether, 100 ether);
    }

    function testInitialReserves() public {
        (uint256 v, uint256 w) = pool.getReserves();
        assertEq(v, 1_000 ether);
        assertEq(w, 100 ether);
    }

    function testSeedRevertsIfAlreadySeeded() public {
        vm.prank(treasury);
        vm.expectRevert(WorkCreditsPoolV1.AlreadySeeded.selector);
        pool.seed(1, 1);
    }

    function testQuoteVoidForWCReasonable() public {
        // Buy 10 WC from 1000/100 pool
        uint256 wcOut = 10 ether;
        uint256 quotedVoid = pool.quoteVoidForWC(wcOut);

        // dx = v * wcOut / (w - wcOut) = 1000*10 / (100-10) = 10000/90 = 111.111... -> ~111
        assertGt(quotedVoid, 110 ether);
        assertLt(quotedVoid, 112 ether);
    }

    function testSwapVoidForWC() public {
        // Give trader some VOID
        voidToken.mint(trader, 50 ether);

        vm.prank(trader);
        voidToken.approve(address(pool), type(uint256).max);

        uint256 voidIn = 10 ether;
        uint256 minWCOut = 0; // accept any positive

        uint256 traderWCBefore = wcToken.balanceOf(trader);
        (uint256 vBefore, uint256 wBefore) = pool.getReserves();

        vm.prank(trader);
        uint256 wcOut = pool.swapVoidForWC(voidIn, minWCOut, trader);

        assertGt(wcOut, 0, "should get some WC");

        uint256 traderWCAfter = wcToken.balanceOf(trader);
        assertEq(traderWCAfter - traderWCBefore, wcOut);

        (uint256 vAfter, uint256 wAfter) = pool.getReserves();

        assertEq(vAfter, vBefore + voidIn);
        assertEq(wAfter, wBefore - wcOut);
    }

    function testSwapVoidForWCSlippageRevert() public {
        voidToken.mint(trader, 10 ether);
        vm.prank(trader);
        voidToken.approve(address(pool), type(uint256).max);

        // Ask for too much WC for given VOID in.
        uint256 voidIn = 10 ether;
        uint256 minWCOut = 100 ether; // unrealistic

        vm.prank(trader);
        vm.expectRevert(WorkCreditsPoolV1.SlippageTooHigh.selector);
        pool.swapVoidForWC(voidIn, minWCOut, trader);
    }

    function testSwapWCForVoid() public {
        // Give trader some WC
        wcToken.mint(trader, 10 ether);
        vm.prank(trader);
        wcToken.approve(address(pool), type(uint256).max);

        uint256 wcIn = 5 ether;
        uint256 minVoidOut = 0;

        uint256 traderVoidBefore = voidToken.balanceOf(trader);
        (uint256 vBefore, uint256 wBefore) = pool.getReserves();

        vm.prank(trader);
        uint256 voidOut = pool.swapWCForVoid(wcIn, minVoidOut, trader);

        assertGt(voidOut, 0, "should get some VOID");

        uint256 traderVoidAfter = voidToken.balanceOf(trader);
        assertEq(traderVoidAfter - traderVoidBefore, voidOut);

        (uint256 vAfter, uint256 wAfter) = pool.getReserves();

        assertEq(vAfter, vBefore - voidOut);
        assertEq(wAfter, wBefore + wcIn);
    }

    function testSwapWCForVoidSlippageRevert() public {
        wcToken.mint(trader, 10 ether);
        vm.prank(trader);
        wcToken.approve(address(pool), type(uint256).max);

        uint256 wcIn = 5 ether;
        uint256 minVoidOut = 1_000 ether; // impossible

        vm.prank(trader);
        vm.expectRevert(WorkCreditsPoolV1.SlippageTooHigh.selector);
        pool.swapWCForVoid(wcIn, minVoidOut, trader);
    }
}
