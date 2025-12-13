// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

error RUN_STUB_ONLY();

contract VoidWorkCreditsMainnetPlan is Script {
    /// @notice PLAN-only stub for WorkCredits mainnet wiring.
    /// @dev
    ///  - Does NOT deploy contracts or broadcast transactions.
    ///  - Later: will read a WorkCredits mainnet config JSON and
    ///    emit a detailed plan for:
    ///       * WorkCreditsToken
    ///       * WorkCreditsPoolV1 (WC/VOID AMM)
    ///       * any helper / relayer contracts.
    function run(string memory configPath) external {
        console2.log("=== [WorkCredits mainnet PLAN (MAINNET) - STUB-ONLY] ===");
        console2.log("configPath:", configPath);
        console2.log("NOTE: This is a PLAN-only placeholder.");
        console2.log("      No deployments or broadcasts happen here yet.");
        console2.log("      Later we will:");
        console2.log("        - Validate WorkCredits mainnet config JSON");
        console2.log("        - Check VOID/WC emissions & pool parameters");
        console2.log("        - Sketch treasury + RewardEngine flows to WC.");
        console2.log("=== [RUN stub complete] About to revert with RUN_STUB_ONLY ===");
        revert RUN_STUB_ONLY();
    }
}
