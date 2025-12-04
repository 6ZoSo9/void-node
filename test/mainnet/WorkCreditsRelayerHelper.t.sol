// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {
    WorkCreditsRelayerHelper,
    IWorkCreditsVault,
    IERC20
} from "../../contracts/mainnet/WorkCreditsRelayerHelper.sol";

/// @dev Simple ERC20 mock implementing the minimal IERC20 interface.
contract ERC20Mock is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20Mock: allowance");
        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "ERC20Mock: to=0");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "ERC20Mock: balance");
        balanceOf[from] = bal - amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/// @dev Mock vault implementing the IWorkCreditsVault interface.
/// For tests we just use a fixed exchange rate and "mint" VOID via ERC20Mock.
contract MockWorkCreditsVault is IWorkCreditsVault {
    IERC20 internal _voidToken;
    IERC20 internal _wcToken;

    uint256 public rate; // how many VOID per 1 WC

    uint256 public lastWcIn;
    uint256 public lastVoidOut;
    address public lastTo;

    constructor(
        IERC20 voidToken_,
        IERC20 wcToken_,
        uint256 rate_
    ) {
        _voidToken = voidToken_;
        _wcToken = wcToken_;
        rate = rate_;
    }

    function voidToken() external view override returns (address) {
        return address(_voidToken);
    }

    function wcToken() external view override returns (address) {
        return address(_wcToken);
    }

    function swapWcForVoid(
        uint256 wcIn,
        uint256 minVoidOut,
        address to
    ) external override returns (uint256 voidOut) {
        require(to != address(0), "MockVault: to=0");
        require(wcIn > 0, "MockVault: wcIn=0");

        lastWcIn = wcIn;
        lastTo = to;

        uint256 out = wcIn * rate;
        require(out >= minVoidOut, "MockVault: slippage");

        lastVoidOut = out;

        // Mint VOID directly to `to`
        ERC20Mock(address(_voidToken)).mint(to, out);
        return out;
    }

    function swapVoidForWc(
        uint256, /* voidIn */
        uint256, /* minWcOut */
        address  /* to */
    ) external pure override returns (uint256) {
        revert("MockVault: swapVoidForWc not implemented");
    }
}

contract WorkCreditsRelayerHelperTest is Test {
    ERC20Mock internal voidToken;
    ERC20Mock internal wcToken;
    MockWorkCreditsVault internal vault;
    WorkCreditsRelayerHelper internal helper;

    address internal admin    = address(0xA1);
    address internal relayer  = address(0xB2);
    address internal user     = address(0xC3);
    address internal receiver = address(0xD4);

    function setUp() public {
        // 1 WC = 2 VOID for easy math
        voidToken = new ERC20Mock("VOID", "VOID");
        wcToken = new ERC20Mock("WorkCredits", "WC");
        vault = new MockWorkCreditsVault(
            IERC20(address(voidToken)),
            IERC20(address(wcToken)),
            2
        );

        helper = new WorkCreditsRelayerHelper(
            admin,
            relayer,
            address(voidToken),
            address(wcToken),
            address(vault)
        );
    }

    function testInitialConfig() public {
        assertEq(helper.admin(), admin);
        assertEq(helper.relayer(), relayer);
        assertEq(address(helper.voidToken()), address(voidToken));
        assertEq(address(helper.wcToken()), address(wcToken));
        assertEq(address(helper.vault()), address(vault));
        assertEq(helper.relayerFeeBps(), 0);
    }

    function testAdminCanUpdateRelayerAndFee() public {
        vm.prank(admin);
        helper.setRelayer(address(0xB3));
        assertEq(helper.relayer(), address(0xB3));

        vm.prank(admin);
        helper.setRelayerFeeBps(100); // 1%
        assertEq(helper.relayerFeeBps(), 100);
    }

    function testNonAdminCannotUpdateConfig() public {
        vm.expectRevert("RelayerHelper: not admin");
        helper.setRelayer(address(0xB3));

        vm.expectRevert("RelayerHelper: not admin");
        helper.setRelayerFeeBps(100);
    }

    function testSwapWcForVoidDirect() public {
        uint256 wcAmount = 100 ether;
        uint256 expectedVoid = wcAmount * 2; // rate = 2

        // Mint WC to user and approve helper
        wcToken.mint(user, wcAmount);
        vm.prank(user);
        wcToken.approve(address(helper), wcAmount);

        // Perform direct swap
        vm.prank(user);
        uint256 out = helper.swapWcForVoidDirect(
            wcAmount,
            expectedVoid,
            receiver
        );

        assertEq(out, expectedVoid, "unexpected voidOut");
        assertEq(vault.lastWcIn(), wcAmount, "vault lastWcIn mismatch");
        assertEq(vault.lastTo(), receiver, "vault lastTo mismatch");
        assertEq(vault.lastVoidOut(), expectedVoid, "vault lastVoidOut mismatch");

        // Receiver should have received VOID
        assertEq(voidToken.balanceOf(receiver), expectedVoid, "receiver VOID balance");
    }

    function testSwapWcForVoidViaRelayerChargesFee() public {
        uint256 wcAmount = 100 ether;
        // 1% fee => 1 ether WC to relayer, 99 ether to vault
        uint256 feeBps = 100;
        uint256 expectedFee = (wcAmount * feeBps) / 10_000;
        uint256 expectedToVault = wcAmount - expectedFee;
        uint256 expectedVoid = expectedToVault * 2; // rate = 2

        // Configure fee
        vm.prank(admin);
        helper.setRelayerFeeBps(feeBps);

        // Mint WC to user and approve helper
        wcToken.mint(user, wcAmount);
        vm.prank(user);
        wcToken.approve(address(helper), wcAmount);

        // Only relayer can call relayer path
        vm.expectRevert("RelayerHelper: not relayer");
        helper.swapWcForVoidViaRelayer(user, wcAmount, 0, receiver);

        // Perform relayer-assisted swap
        vm.prank(relayer);
        uint256 out = helper.swapWcForVoidViaRelayer(
            user,
            wcAmount,
            0,
            receiver
        );

        assertEq(out, expectedVoid, "unexpected voidOut");
        assertEq(vault.lastWcIn(), expectedToVault, "vault lastWcIn mismatch");
        assertEq(vault.lastTo(), receiver, "vault lastTo mismatch");
        assertEq(vault.lastVoidOut(), expectedVoid, "vault lastVoidOut mismatch");

        // Receiver gets VOID
        assertEq(voidToken.balanceOf(receiver), expectedVoid, "receiver VOID balance");

        // Relayer receives WC fee
        assertEq(wcToken.balanceOf(relayer), expectedFee, "relayer WC fee balance");

        // User spent total wcAmount
        assertEq(wcToken.balanceOf(user), 0, "user WC balance");
    }
}
