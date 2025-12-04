// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20 interface used by WorkCreditsRelayerHelper and mocks.
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Minimal interface for the WC/VOID LLP vault used by the relayer helper.
/// The real implementation is UptimeVaultLLP, but we only depend on this subset.
interface IWorkCreditsVault {
    function voidToken() external view returns (address);
    function wcToken() external view returns (address);

    /// @notice Swap WC for VOID, sending VOID to `to`.
    function swapWcForVoid(uint256 wcIn, uint256 minVoidOut, address to) external returns (uint256 voidOut);

    /// @notice Swap VOID for WC, sending WC to `to`.
    function swapVoidForWc(uint256 voidIn, uint256 minWcOut, address to) external returns (uint256 wcOut);
}

/// @title WorkCreditsRelayerHelper
/// @notice Helper contract that sits in front of the WC/VOID LLP (UptimeVaultLLP) and
///         implements two execution paths:
///         - Direct: user calls swap and pays gas with their own VOID (cheapest).
///         - Relayer: trusted relayer calls on behalf of user, charging a WC fee
///           so the relayer can pay gas from its own VOID and stay solvent.
///         This contract never mints or burns; it only moves WC and calls the vault.
contract WorkCreditsRelayerHelper {
    IERC20 public immutable voidToken;
    IERC20 public immutable wcToken;
    IWorkCreditsVault public immutable vault;

    address public admin;
    address public relayer;
    uint256 public relayerFeeBps; // applied only on relayer path

    uint256 internal constant BPS_DENOMINATOR = 10_000;

    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event RelayerFeeBpsUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    event SwapWcForVoidDirect(address indexed caller, address indexed to, uint256 wcIn, uint256 voidOut);

    event SwapWcForVoidViaRelayer(
        address indexed user,
        address indexed to,
        uint256 wcInTotal,
        uint256 wcInToVault,
        uint256 wcFeeToRelayer,
        uint256 voidOut
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "RelayerHelper: not admin");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "RelayerHelper: not relayer");
        _;
    }

    constructor(address _admin, address _relayer, address _voidToken, address _wcToken, address _vault) {
        require(_admin != address(0), "RelayerHelper: admin=0");
        require(_relayer != address(0), "RelayerHelper: relayer=0");
        require(_voidToken != address(0), "RelayerHelper: voidToken=0");
        require(_wcToken != address(0), "RelayerHelper: wcToken=0");
        require(_vault != address(0), "RelayerHelper: vault=0");

        admin = _admin;
        relayer = _relayer;
        voidToken = IERC20(_voidToken);
        wcToken = IERC20(_wcToken);
        vault = IWorkCreditsVault(_vault);

        // default relayer fee = 0 bps; must be explicitly set
        relayerFeeBps = 0;
    }

    // -------------------------
    // Admin configuration
    // -------------------------

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "RelayerHelper: admin=0");
        address old = admin;
        admin = newAdmin;
        emit AdminUpdated(old, newAdmin);
    }

    function setRelayer(address newRelayer) external onlyAdmin {
        require(newRelayer != address(0), "RelayerHelper: relayer=0");
        address old = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(old, newRelayer);
    }

    /// @notice Set the relayer fee in basis points (1% = 100).
    ///         This fee is only applied on the relayer path.
    function setRelayerFeeBps(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 1_000, "RelayerHelper: fee too high"); // <= 10%
        uint256 old = relayerFeeBps;
        relayerFeeBps = newFeeBps;
        emit RelayerFeeBpsUpdated(old, newFeeBps);
    }

    // -------------------------
    // Direct path (user pays gas with own VOID)
    // -------------------------

    /// @notice Swap WC for VOID through the vault. Caller pays gas directly in VOID.
    /// @dev
    ///  - Caller must have approved `wcToken` for at least `wcIn` to this helper.
    ///  - No extra WC fee is taken on this path; it is the cheapest route.
    function swapWcForVoidDirect(uint256 wcIn, uint256 minVoidOut, address to) external returns (uint256 voidOut) {
        require(wcIn > 0, "RelayerHelper: wcIn=0");
        require(to != address(0), "RelayerHelper: to=0");

        // Pull WC from caller
        require(wcToken.transferFrom(msg.sender, address(this), wcIn), "RelayerHelper: transferFrom failed");

        // Approve vault for this exact amount
        require(wcToken.approve(address(vault), wcIn), "RelayerHelper: approve failed");

        // Swap via vault, sending VOID to `to`
        uint256 out = vault.swapWcForVoid(wcIn, minVoidOut, to);

        emit SwapWcForVoidDirect(msg.sender, to, wcIn, out);
        return out;
    }

    // -------------------------
    // Relayer path (user pays in WC, relayer pays gas in VOID)
    // -------------------------

    /// @notice Relayer-assisted WC->VOID swap.
    /// @dev
    ///  - Called only by the configured `relayer` address.
    ///  - `user` must have approved `wcToken` to this helper for at least `wcIn`.
    ///  - A WC fee is taken to the relayer according to `relayerFeeBps`.
    ///  - The remaining WC is swapped via the vault; VOID is sent to `to`.
    function swapWcForVoidViaRelayer(address user, uint256 wcIn, uint256 minVoidOut, address to)
        external
        onlyRelayer
        returns (uint256 voidOut)
    {
        require(user != address(0), "RelayerHelper: user=0");
        require(to != address(0), "RelayerHelper: to=0");
        require(wcIn > 0, "RelayerHelper: wcIn=0");

        // Pull the full WC amount from the user
        require(wcToken.transferFrom(user, address(this), wcIn), "RelayerHelper: transferFrom failed");

        // Compute fee
        uint256 fee = 0;
        if (relayerFeeBps > 0) {
            fee = (wcIn * relayerFeeBps) / BPS_DENOMINATOR;
            require(wcIn > fee, "RelayerHelper: fee too high");
        }

        uint256 swapAmount = wcIn - fee;

        // Approve vault and perform swap
        require(wcToken.approve(address(vault), swapAmount), "RelayerHelper: approve failed");
        uint256 out = vault.swapWcForVoid(swapAmount, minVoidOut, to);

        // Pay WC fee to relayer
        if (fee > 0) {
            require(wcToken.transfer(relayer, fee), "RelayerHelper: fee transfer failed");
        }

        emit SwapWcForVoidViaRelayer(user, to, wcIn, swapAmount, fee, out);

        return out;
    }

    // Expose denominator as a pure function to avoid stack issues in tests if needed.
}
