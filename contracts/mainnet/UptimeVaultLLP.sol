// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20-like interface for VOID token.
interface IERC20Like {
    function balanceOf(address who) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @notice Minimal interface for WorkCreditsToken.
interface IWorkCreditsTokenLike {
    function balanceOf(address who) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function totalSupply() external view returns (uint256);
}

/// @title UptimeVaultLLP
/// @notice Locked Liquidity Pool (LLP) for WC↔VOID with constant-product pricing.
///
///         - Liquidity is protocol-owned and locked (no withdrawals).
///         - Seeded once (e.g. with 10M VOID + some WC) via `seedLockedLiquidity`.
///         - Optional manual top-ups via `addLockedLiquidity` (governance only).
///         - Price is entirely AMM-driven; no manual "set price".
///         - A tiny fee on swaps accumulates in the pool, building backing over time.
contract UptimeVaultLLP {
    IERC20Like public immutable VOID;
    IWorkCreditsTokenLike public immutable WC;

    /// @notice Governance address (can seed / top-up / adjust fee). In practice this can be wired to AdminGate/ConfigGate.
    address public governance;

    // reserves tracked for pricing; use actual balances on-chain as source of truth
    uint112 public reserveVoid;
    uint112 public reserveWc;

    /// @notice Swap fee in basis points (1e-4). Example: 5 = 0.05%, 30 = 0.30%.
    uint16 public feeBps = 5;

    /// @notice True once initial locked liquidity has been seeded.
    bool public seeded;

    event GovernanceChanged(address indexed oldGov, address indexed newGov);
    event FeeChanged(uint16 oldFeeBps, uint16 newFeeBps);

    event SeedLockedLiquidity(uint256 amountVoid, uint256 amountWc);
    event AddLockedLiquidity(uint256 amountVoid, uint256 amountWc);

    event Sync(uint112 reserveVoid, uint112 reserveWc);

    event SwapWcForVoid(address indexed user, uint256 amountIn, uint256 amountOut);
    event SwapVoidForWc(address indexed user, uint256 amountIn, uint256 amountOut);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Vault: not governance");
        _;
    }

    constructor(address _void, address _wc, address _gov) {
        require(_void != address(0) && _wc != address(0) && _gov != address(0), "Vault: zero addr");
        VOID = IERC20Like(_void);
        WC = IWorkCreditsTokenLike(_wc);
        governance = _gov;
        emit GovernanceChanged(address(0), _gov);
    }

    // --- governance controls ---

    function setGovernance(address _gov) external onlyGovernance {
        require(_gov != address(0), "Vault: zero gov");
        emit GovernanceChanged(governance, _gov);
        governance = _gov;
    }

    function setFeeBps(uint16 _feeBps) external onlyGovernance {
        // safety upper bound; we expect this to be very small in practice (e.g. 5–30 bps)
        require(_feeBps <= 1000, "Vault: fee too high"); // max 10%
        emit FeeChanged(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    // --- view helpers ---

    function getReserves() public view returns (uint112, uint112) {
        return (reserveVoid, reserveWc);
    }

    // --- internal math helpers ---

    function _updateReserves() internal {
        uint256 voidBal = VOID.balanceOf(address(this));
        uint256 wcBal = WC.balanceOf(address(this));
        require(voidBal <= type(uint112).max && wcBal <= type(uint112).max, "Vault: overflow");
        reserveVoid = uint112(voidBal);
        reserveWc = uint112(wcBal);
        emit Sync(reserveVoid, reserveWc);
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal view returns (uint256) {
        require(amountIn > 0, "Vault: amountIn=0");
        require(reserveIn > 0 && reserveOut > 0, "Vault: empty reserves");

        uint256 amountInWithFee = amountIn * (10_000 - feeBps);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 10_000 + amountInWithFee;
        return numerator / denominator;
    }

    // --- locked liquidity (no withdrawals) ---

    /// @notice One-shot initial locked liquidity seed (e.g. 10M VOID + some WC).
    ///         Callable only once by governance. Liquidity is considered permanently locked.
    function seedLockedLiquidity(uint256 amountVoid, uint256 amountWc) external onlyGovernance {
        require(!seeded, "Vault: already seeded");
        require(amountVoid > 0 && amountWc > 0, "Vault: zero amounts");

        require(
            VOID.transferFrom(msg.sender, address(this), amountVoid),
            "Vault: VOID transfer failed"
        );
        require(
            WC.transferFrom(msg.sender, address(this), amountWc),
            "Vault: WC transfer failed"
        );

        seeded = true;
        _updateReserves();
        emit SeedLockedLiquidity(amountVoid, amountWc);
    }

    /// @notice Optional manual top-up of locked liquidity by governance.
    ///         No withdrawals are supported; this only adds more VOID/WC to the LLP.
    function addLockedLiquidity(uint256 amountVoid, uint256 amountWc) external onlyGovernance {
        require(seeded, "Vault: not seeded");
        require(amountVoid > 0 || amountWc > 0, "Vault: zero amounts");

        if (amountVoid > 0) {
            require(
                VOID.transferFrom(msg.sender, address(this), amountVoid),
                "Vault: VOID transfer failed"
            );
        }
        if (amountWc > 0) {
            require(
                WC.transferFrom(msg.sender, address(this), amountWc),
                "Vault: WC transfer failed"
            );
        }

        _updateReserves();
        emit AddLockedLiquidity(amountVoid, amountWc);
    }

    // NOTE: There is intentionally *no* removeLiquidity / withdraw function.
    // Liquidity is locked; any VOID/WC put into this contract stays as backing for WC↔VOID swaps.

    // --- swaps ---

    /// @notice Swap WC -> VOID. Caller must have approved WC to this contract.
    function swapWcForVoid(uint256 amountIn, uint256 minOut, address to) external {
        require(seeded, "Vault: not seeded");
        require(to != address(0), "Vault: zero to");

        // Pull WC from user
        require(WC.transferFrom(msg.sender, address(this), amountIn), "Vault: WC transferIn failed");

        (uint112 rVoid, uint112 rWc) = getReserves();
        uint256 amountOut = _getAmountOut(amountIn, rWc, rVoid);
        require(amountOut >= minOut, "Vault: slippage");

        // Send VOID to `to`
        require(VOID.transfer(to, amountOut), "Vault: VOID transferOut failed");

        _updateReserves();
        emit SwapWcForVoid(msg.sender, amountIn, amountOut);
    }

    /// @notice Swap VOID -> WC. Caller must have approved VOID to this contract.
    function swapVoidForWc(uint256 amountIn, uint256 minOut, address to) external {
        require(seeded, "Vault: not seeded");
        require(to != address(0), "Vault: zero to");

        // Pull VOID from user
        require(VOID.transferFrom(msg.sender, address(this), amountIn), "Vault: VOID transferIn failed");

        (uint112 rVoid, uint112 rWc) = getReserves();
        uint256 amountOut = _getAmountOut(amountIn, rVoid, rWc);
        require(amountOut >= minOut, "Vault: slippage");

        // Send WC to `to`
        require(WC.transfer(to, amountOut), "Vault: WC transferOut failed");

        _updateReserves();
        emit SwapVoidForWc(msg.sender, amountIn, amountOut);
    }
}
