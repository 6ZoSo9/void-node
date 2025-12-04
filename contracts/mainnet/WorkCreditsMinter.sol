// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {WorkCreditsToken} from "./WorkCreditsToken.sol";

/// @title WorkCreditsMinter
/// @notice Thin shim that mints Work Credits (WC) for workers based on
///         decisions made by RewardEngine / mainnet logic.
///         - VOID remains the scarce asset.
///         - WC is soft, unlimited, and only used for perks / internal accounting.
///         - This contract is the *only* minter for WC in mainnet wiring.
contract WorkCreditsMinter {
    /// @notice The Work Credits token being minted.
    WorkCreditsToken public immutable wc;

    /// @notice Admin address that can rotate rewardEngine and admin itself.
    ///         In real mainnet, this would be wired under AdminGate / ConfigGate
    ///         or a dedicated governance controller, not a random EOA.
    address public admin;

    /// @notice The only address allowed to call award(), typically RewardEngine.
    address public rewardEngine;

    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event RewardEngineUpdated(address indexed oldRewardEngine, address indexed newRewardEngine);

    /// @notice Emitted whenever WC are awarded to a worker.
    /// @param to recipient of WC
    /// @param amount amount of WC minted
    /// @param pillar high-level pillar label (e.g. "mainnet-core", "safeboot", "ai-work")
    /// @param agent worker label (e.g. "zoso", "ai", "validator-1")
    /// @param category more granular category (e.g. "design", "bootstrap", "agent-jobs")
    event WorkCreditsAwarded(
        address indexed to, uint256 amount, bytes32 indexed pillar, bytes32 indexed agent, bytes32 category
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "WCMinter: not admin");
        _;
    }

    modifier onlyRewardEngine() {
        require(msg.sender == rewardEngine, "WCMinter: not rewardEngine");
        _;
    }

    /// @param wc_ address of the WorkCreditsToken contract
    /// @param admin_ initial admin (can later be rotated)
    constructor(address wc_, address admin_) {
        require(wc_ != address(0), "WCMinter: wc zero");
        require(admin_ != address(0), "WCMinter: admin zero");
        wc = WorkCreditsToken(wc_);
        admin = admin_;
        emit AdminUpdated(address(0), admin_);
    }

    /// @notice Rotate admin to a new address.
    ///         Expected to be called rarely, and only as part of governance flows.
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "WCMinter: admin zero");
        address old = admin;
        admin = newAdmin;
        emit AdminUpdated(old, newAdmin);
    }

    /// @notice Set or rotate the RewardEngine address.
    ///         Only admin may call; RewardEngine itself has no special power beyond award().
    function setRewardEngine(address newRewardEngine) external onlyAdmin {
        require(newRewardEngine != address(0), "WCMinter: rewardEngine zero");
        address old = rewardEngine;
        rewardEngine = newRewardEngine;
        emit RewardEngineUpdated(old, newRewardEngine);
    }

    /// @notice Mint WC to a worker.
    /// @dev Only callable by rewardEngine. This contract is expected to be
    ///      configured as the sole minter in WorkCreditsToken (wc.setMinter(address(this))).
    /// @param to recipient address
    /// @param amount amount of WC to mint (cannot be zero)
    /// @param pillar pillar label (bytes32-encoded string, e.g. "mainnet-core")
    /// @param agent agent label (bytes32-encoded string, e.g. "ai" or "zoso")
    /// @param category category label (bytes32-encoded string, e.g. "design")
    function award(address to, uint256 amount, bytes32 pillar, bytes32 agent, bytes32 category)
        external
        onlyRewardEngine
    {
        require(to != address(0), "WCMinter: to zero");
        require(amount > 0, "WCMinter: zero amount");

        wc.mint(to, amount);

        emit WorkCreditsAwarded(to, amount, pillar, agent, category);
    }
}
