// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VoidEmissionsController
/// @notice Pure accounting guardrail for VOID mainnet emissions.
///         Enforces per-era budgets and a global emissions cap that match
///         the canonical tokenomics spec (docs/VOID-MAINNET-ALLOCATION-SPEC.md).
contract VoidEmissionsController {
    // ----- Constants: per-era budgets (18 decimals, VOIDSTONES) -----
    // Era totals (human-readable):
    //   Era1 = 177,777,777
    //   Era2 =  88,888,889
    //   Era3 =  44,444,444
    //   Era4 =  22,222,223
    uint256 public constant ERA1_BUDGET = 177_777_777 * 1e18;
    uint256 public constant ERA2_BUDGET = 88_888_889 * 1e18;
    uint256 public constant ERA3_BUDGET = 44_444_444 * 1e18;
    uint256 public constant ERA4_BUDGET = 22_222_223 * 1e18;

    /// @notice Total emissions budget across all eras (333,333,333 VOIDSTONES).
    uint256 public constant EMISSIONS_BUDGET = ERA1_BUDGET + ERA2_BUDGET + ERA3_BUDGET + ERA4_BUDGET;

    // ----- Admin -----
    address public admin;

    // ----- State: accounting -----
    /// @notice Emitted amount per era (1..4), in 18-decimal VOIDSTONES.
    mapping(uint8 => uint256) public mintedByEra;

    /// @notice Total emitted across all eras, in 18-decimal VOIDSTONES.
    uint256 public totalEmitted;

    // ----- Errors -----
    error NotAdmin();
    error InvalidEra(uint8 era);
    error EraBudgetExceeded(uint8 era, uint256 newTotal, uint256 budget);
    error GlobalBudgetExceeded(uint256 newTotal, uint256 budget);

    // ----- Events -----
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event EmissionConsumed(uint8 indexed era, uint256 amount, uint256 newEraTotal, uint256 newGlobalTotal);

    // ----- Modifiers -----
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "admin=0");
        admin = _admin;
        emit AdminChanged(address(0), _admin);
    }

    /// @notice Change the admin. Intended to be wired to AdminGate / governance later.
    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "admin=0");
        emit AdminChanged(admin, _admin);
        admin = _admin;
    }

    /// @notice Consume part of an era's emissions budget.
    /// @dev This does NOT mint tokens. It only updates accounting and enforces caps.
    ///      The caller (router/rewards contract) should call this *before* minting.
    /// @param era Era index (1..4).
    /// @param amount Amount of VOIDSTONES (18 decimals) to consume from that era.
    function consumeEmission(uint8 era, uint256 amount) external onlyAdmin {
        if (era < 1 || era > 4) revert InvalidEra(era);
        if (amount == 0) {
            // no-op; keep it cheap and harmless
            return;
        }

        uint256 budget = _eraBudget(era);

        // Era-level check
        uint256 newEraTotal = mintedByEra[era] + amount;
        if (newEraTotal > budget) {
            revert EraBudgetExceeded(era, newEraTotal, budget);
        }

        // Global-level check
        uint256 newGlobalTotal = totalEmitted + amount;
        if (newGlobalTotal > EMISSIONS_BUDGET) {
            revert GlobalBudgetExceeded(newGlobalTotal, EMISSIONS_BUDGET);
        }

        mintedByEra[era] = newEraTotal;
        totalEmitted = newGlobalTotal;

        emit EmissionConsumed(era, amount, newEraTotal, newGlobalTotal);
    }

    /// @notice Return the remaining budget for a given era.
    function remainingInEra(uint8 era) external view returns (uint256) {
        if (era < 1 || era > 4) revert InvalidEra(era);
        uint256 budget = _eraBudget(era);
        uint256 used = mintedByEra[era];
        if (used >= budget) return 0;
        return budget - used;
    }

    /// @notice Return the remaining global emissions budget.
    function remainingGlobal() external view returns (uint256) {
        if (totalEmitted >= EMISSIONS_BUDGET) return 0;
        return EMISSIONS_BUDGET - totalEmitted;
    }

    // ----- Internal helpers -----
    function _eraBudget(uint8 era) internal pure returns (uint256) {
        if (era == 1) return ERA1_BUDGET;
        if (era == 2) return ERA2_BUDGET;
        if (era == 3) return ERA3_BUDGET;
        // era == 4 guaranteed by caller
        return ERA4_BUDGET;
    }
}
