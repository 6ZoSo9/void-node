// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal constant-product VOID/WC AMM for devnet, no external deps.
/// - Owner controls seeding + extra liquidity.
/// - Anyone can swap VOID <-> WC (x*y=k, no fee).
/// - Uses low-level ERC20 calls so it works with any sensible VoidToken impl.
contract VoidWorkCreditsPool {
    // ERC20 function selectors
    bytes4 private constant SELECTOR_BALANCE_OF   = 0x70a08231; // balanceOf(address)
    bytes4 private constant SELECTOR_TRANSFER     = 0xa9059cbb; // transfer(address,uint256)
    bytes4 private constant SELECTOR_TRANSFERFROM = 0x23b872dd; // transferFrom(address,address,uint256)

    address public immutable voidToken;
    address public immutable workCreditsToken;

    // UniV2-style packed reserves + last update timestamp
    uint112 private reserveVoid;
    uint112 private reserveWc;
    uint32  private blockTimestampLast;

    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Seeded(uint256 voidAmount, uint256 wcAmount);
    event LiquidityAdded(uint256 voidAmount, uint256 wcAmount);
    event SwapVoidForWc(address indexed sender, uint256 voidIn, uint256 wcOut, address indexed to);
    event SwapWcForVoid(address indexed sender, uint256 wcIn, uint256 voidOut, address indexed to);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _voidToken, address _workCreditsToken, address initialOwner) {
        require(_voidToken != address(0), "void token is zero");
        require(_workCreditsToken != address(0), "wc token is zero");
        require(initialOwner != address(0), "owner is zero");

        voidToken = _voidToken;
        workCreditsToken = _workCreditsToken;

        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    // ------------------------------------------------------------------------
    // Ownership
    // ------------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------------------------------
    // ERC20 helpers (low-level)
    // ------------------------------------------------------------------------

    function _balanceOf(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSelector(SELECTOR_BALANCE_OF, account)
        );
        require(ok && data.length >= 32, "balanceOf failed");
        return abi.decode(data, (uint256));
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, ) = token.call(
            abi.encodeWithSelector(SELECTOR_TRANSFER, to, amount)
        );
        require(ok, "transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, ) = token.call(
            abi.encodeWithSelector(SELECTOR_TRANSFERFROM, from, to, amount)
        );
        require(ok, "transferFrom failed");
    }

    // ------------------------------------------------------------------------
    // Views for exporter / pricing
    // ------------------------------------------------------------------------

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserveVoid, reserveWc, blockTimestampLast);
    }

    /// @notice WC per 1 VOID, scaled by 1e18.
    function getPriceWcPerVoid() external view returns (uint256) {
        require(reserveVoid > 0, "no void reserve");
        return (uint256(reserveWc) * 1e18) / uint256(reserveVoid);
    }

    /// @notice VOID per 1 WC, scaled by 1e18.
    function getPriceVoidPerWc() external view returns (uint256) {
        require(reserveWc > 0, "no wc reserve");
        return (uint256(reserveVoid) * 1e18) / uint256(reserveWc);
    }

    // ------------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------------

    function _update(uint256 balanceVoid, uint256 balanceWc) private {
        require(balanceVoid <= type(uint112).max, "void overflow");
        require(balanceWc <= type(uint112).max, "wc overflow");

        reserveVoid = uint112(balanceVoid);
        reserveWc = uint112(balanceWc);
        blockTimestampLast = uint32(block.timestamp);
    }

    function _currentBalances() private view returns (uint256 bVoid, uint256 bWc) {
        bVoid = _balanceOf(voidToken, address(this));
        bWc = _balanceOf(workCreditsToken, address(this));
    }

    /// @notice Pure x*y=k pricing, no fee.
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0, "zero in");
        require(reserveIn > 0 && reserveOut > 0, "no liquidity");
        // Very simple constant-product: out = in * R_out / (R_in + in)
        return (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    // ------------------------------------------------------------------------
    // Owner liquidity controls (devnet only)
    // ------------------------------------------------------------------------

    /// @notice One-time initial seeding of VOID+WC.
    /// Caller must have approved this contract for both tokens.
    function seed(uint256 amountVoid, uint256 amountWc) external onlyOwner {
        require(reserveVoid == 0 && reserveWc == 0, "already seeded");
        require(amountVoid > 0 && amountWc > 0, "zero amount");

        _safeTransferFrom(voidToken, msg.sender, address(this), amountVoid);
        _safeTransferFrom(workCreditsToken, msg.sender, address(this), amountWc);

        (uint256 bVoid, uint256 bWc) = _currentBalances();
        _update(bVoid, bWc);

        emit Seeded(amountVoid, amountWc);
    }

    /// @notice Top up liquidity after initial seed.
    function addLiquidity(uint256 amountVoid, uint256 amountWc) external onlyOwner {
        require(amountVoid > 0 && amountWc > 0, "zero amount");
        require(reserveVoid > 0 && reserveWc > 0, "not seeded");

        _safeTransferFrom(voidToken, msg.sender, address(this), amountVoid);
        _safeTransferFrom(workCreditsToken, msg.sender, address(this), amountWc);

        (uint256 bVoid, uint256 bWc) = _currentBalances();
        _update(bVoid, bWc);

        emit LiquidityAdded(amountVoid, amountWc);
    }

    // ------------------------------------------------------------------------
    // Swaps (public)
    // ------------------------------------------------------------------------

    function swapVoidForWc(
        uint256 amountVoidIn,
        uint256 minWcOut,
        address to
    ) external returns (uint256 amountOut) {
        require(to != address(0), "bad to");
        require(amountVoidIn > 0, "zero in");

        _safeTransferFrom(voidToken, msg.sender, address(this), amountVoidIn);

        uint256 balanceVoid = _balanceOf(voidToken, address(this));
        uint256 balanceWc = _balanceOf(workCreditsToken, address(this));

        uint256 voidIn = balanceVoid - uint256(reserveVoid);
        require(voidIn >= amountVoidIn, "invariant violation");

        amountOut = getAmountOut(voidIn, uint256(reserveVoid), uint256(reserveWc));
        require(amountOut >= minWcOut, "slippage");
        require(balanceWc >= amountOut, "insufficient wc");

        _safeTransfer(workCreditsToken, to, amountOut);

        (uint256 newBalanceVoid, uint256 newBalanceWc) = _currentBalances();
        _update(newBalanceVoid, newBalanceWc);

        emit SwapVoidForWc(msg.sender, amountVoidIn, amountOut, to);
    }

    function swapWcForVoid(
        uint256 amountWcIn,
        uint256 minVoidOut,
        address to
    ) external returns (uint256 amountOut) {
        require(to != address(0), "bad to");
        require(amountWcIn > 0, "zero in");

        _safeTransferFrom(workCreditsToken, msg.sender, address(this), amountWcIn);

        uint256 balanceVoid = _balanceOf(voidToken, address(this));
        uint256 balanceWc = _balanceOf(workCreditsToken, address(this));

        uint256 wcIn = balanceWc - uint256(reserveWc);
        require(wcIn >= amountWcIn, "invariant violation");

        amountOut = getAmountOut(wcIn, uint256(reserveWc), uint256(reserveVoid));
        require(amountOut >= minVoidOut, "slippage");
        require(balanceVoid >= amountOut, "insufficient void");

        _safeTransfer(voidToken, to, amountOut);

        (uint256 newBalanceVoid, uint256 newBalanceWc) = _currentBalances();
        _update(newBalanceVoid, newBalanceWc);

        emit SwapWcForVoid(msg.sender, amountWcIn, amountOut, to);
    }
}
