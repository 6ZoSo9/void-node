// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20 interface used by WorkCreditsPoolV1.
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title WorkCreditsPoolV1
/// @notice Simple protocol-owned VOID/WC constant-product pool for Work Credits.
///         - Single treasury-controlled seed of liquidity.
///         - Anyone can trade VOID <-> WC via swap functions.
///         - Quotes are deterministic and side-effect free.
contract WorkCreditsPoolV1 {
    // ------------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------------

    error OnlyTreasury();
    error AlreadySeeded();
    error InvalidAmount();
    error InsufficientLiquidity();
    error SlippageTooHigh();
    error ZeroAddress();

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event Seeded(uint256 voidAmount, uint256 wcAmount);
    event SwapVoidForWC(address indexed caller, address indexed to, uint256 voidIn, uint256 wcOut);
    event SwapWCForVoid(address indexed caller, address indexed to, uint256 wcIn, uint256 voidOut);

    // ------------------------------------------------------------------------
    // Immutable config
    // ------------------------------------------------------------------------

    IERC20 public immutable voidToken;
    IERC20 public immutable wcToken;
    address public immutable treasury;

    // ------------------------------------------------------------------------
    // Reserves (VOID = token0, WC = token1)
    // ------------------------------------------------------------------------

    uint256 public reserveVoid;
    uint256 public reserveWC;

    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------

    constructor(address _voidToken, address _wcToken, address _treasury) {
        if (_voidToken == address(0) || _wcToken == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        voidToken = IERC20(_voidToken);
        wcToken = IERC20(_wcToken);
        treasury = _treasury;
    }

    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }

    // ------------------------------------------------------------------------
    // View helpers
    // ------------------------------------------------------------------------

    function getReserves() external view returns (uint256 voidReserves, uint256 wcReserves) {
        voidReserves = reserveVoid;
        wcReserves = reserveWC;
    }

    /// @notice Quote how much VOID is required to buy `wcOut` from current reserves.
    function quoteVoidForWC(uint256 wcOut) public view returns (uint256 voidIn) {
        uint256 v = reserveVoid;
        uint256 w = reserveWC;
        if (wcOut == 0) revert InvalidAmount();
        if (wcOut >= w) revert InsufficientLiquidity();
        // Constant product: (v + dx) * (w - wcOut) = v * w  => dx = v * wcOut / (w - wcOut)
        voidIn = (v * wcOut) / (w - wcOut);
    }

    /// @notice Quote how much WC is required to buy `voidOut` from current reserves.
    function quoteWCForVoid(uint256 voidOut) public view returns (uint256 wcIn) {
        uint256 v = reserveVoid;
        uint256 w = reserveWC;
        if (voidOut == 0) revert InvalidAmount();
        if (voidOut >= v) revert InsufficientLiquidity();
        // Symmetric to above: (v - voidOut) * (w + dy) = v * w  => dy = w * voidOut / (v - voidOut)
        wcIn = (w * voidOut) / (v - voidOut);
    }

    // ------------------------------------------------------------------------
    // Treasury-controlled seed
    // ------------------------------------------------------------------------

    /// @notice One-time seed of the pool by the treasury.
    /// @dev Expects tokens already approved to this contract.
    function seed(uint256 voidAmount, uint256 wcAmount) external onlyTreasury {
        if (reserveVoid != 0 || reserveWC != 0) revert AlreadySeeded();
        if (voidAmount == 0 || wcAmount == 0) revert InvalidAmount();

        _safeTransferFrom(voidToken, msg.sender, address(this), voidAmount);
        _safeTransferFrom(wcToken, msg.sender, address(this), wcAmount);

        reserveVoid = voidAmount;
        reserveWC = wcAmount;

        emit Seeded(voidAmount, wcAmount);
    }

    // ------------------------------------------------------------------------
    // Swaps
    // ------------------------------------------------------------------------

    function swapVoidForWC(uint256 voidIn, uint256 minWCOut, address to) external returns (uint256 wcOut) {
        if (voidIn == 0) revert InvalidAmount();
        if (to == address(0)) revert ZeroAddress();

        // Pull VOID from caller
        _safeTransferFrom(voidToken, msg.sender, address(this), voidIn);

        // Compute output based on current reserves and input.
        uint256 v = reserveVoid;
        uint256 w = reserveWC;
        // amountOut = (voidIn * w) / (v + voidIn)
        wcOut = (voidIn * w) / (v + voidIn);
        if (wcOut == 0) revert InsufficientLiquidity();
        if (wcOut > w) revert InsufficientLiquidity();
        if (wcOut < minWCOut) revert SlippageTooHigh();

        // Update reserves first, then transfer out.
        uint256 newV = v + voidIn;
        uint256 newW = w - wcOut;
        reserveVoid = newV;
        reserveWC = newW;

        _safeTransfer(wcToken, to, wcOut);

        emit SwapVoidForWC(msg.sender, to, voidIn, wcOut);
    }

    function swapWCForVoid(uint256 wcIn, uint256 minVoidOut, address to) external returns (uint256 voidOut) {
        if (wcIn == 0) revert InvalidAmount();
        if (to == address(0)) revert ZeroAddress();

        _safeTransferFrom(wcToken, msg.sender, address(this), wcIn);

        uint256 v = reserveVoid;
        uint256 w = reserveWC;
        // amountOut = (wcIn * v) / (w + wcIn)
        voidOut = (wcIn * v) / (w + wcIn);
        if (voidOut == 0) revert InsufficientLiquidity();
        if (voidOut > v) revert InsufficientLiquidity();
        if (voidOut < minVoidOut) revert SlippageTooHigh();

        uint256 newV = v - voidOut;
        uint256 newW = w + wcIn;
        reserveVoid = newV;
        reserveWC = newW;

        _safeTransfer(voidToken, to, voidOut);

        emit SwapWCForVoid(msg.sender, to, wcIn, voidOut);
    }

    // ------------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------------

    function _safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        bool ok = token.transferFrom(from, to, amount);
        require(ok, "TRANSFER_FROM_FAILED");
    }

    function _safeTransfer(IERC20 token, address to, uint256 amount) internal {
        bool ok = token.transfer(to, amount);
        require(ok, "TRANSFER_FAILED");
    }
}
