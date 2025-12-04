// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

/// @dev PLAN-only script: reads LIVE JSON and prints the Work Credits roles
///      and the canonical 10M VOID split for WC plumbing. It does not deploy
///      or move any funds.
contract VoidWorkCreditsMainnetPlan is Script {
    using stdJson for string;

    function run() external {
        // Default config path, can be overridden with VOID_MAINNET_CFG env var.
        string memory defaultPath = "config/void-mainnet-bootstrap-mainnet.live.json";
        string memory configPath = vm.envOr("VOID_MAINNET_CFG", defaultPath);

        console2.log("=== VOID Work Credits mainnet PLAN ===");
        console2.log("config path:", configPath);

        // Read JSON
        string memory json = vm.readFile(configPath);

        // WC-related roles under .roles.*
        address wcGovernance = json.readAddress(".roles.wcGovernance");
        address wcMinterAdmin = json.readAddress(".roles.wcMinterAdmin");
        address lpTreasury = json.readAddress(".roles.lpTreasury");
        address relayerAdmin = json.readAddress(".roles.relayerAdmin");

        console2.log("");
        console2.log("== WC / LLP / relayer roles (from LIVE JSON) ==");
        _logRole("wcGovernance", wcGovernance);
        _logRole("wcMinterAdmin", wcMinterAdmin);
        _logRole("lpTreasury", lpTreasury);
        _logRole("relayerAdmin", relayerAdmin);

        // Canonical 10M VOID split for WC plumbing
        uint256 totalSeedVoid = 10_000_000e18;
        uint256 lpSeedVoid = 9_800_000e18;
        uint256 relayerSeedVoid = 200_000e18;

        console2.log("");
        console2.log("== Canonical VOID seed for WC plumbing ==");
        console2.log("total seed VOID (wei):", totalSeedVoid);
        console2.log("LLP (UptimeVaultLLP) VOID (wei):", lpSeedVoid);
        console2.log("Relayers total VOID (wei):", relayerSeedVoid);

        console2.log("");
        console2.log("Notes:");
        console2.log("- Addresses above come from LIVE JSON only.");
        console2.log("- They should stay 0x000... until we run the real mainnet key ceremony.");
        console2.log("- The 10M split numbers must match docs/work-credits-plan.md.");
        console2.log("- This script is PLAN-only: no deployments, no fund movements.");
    }

    function _logRole(string memory label, address who) internal {
        console2.log(label, who);
        if (who == address(0)) {
            console2.log("  -> STATUS: PENDING (0x0 in LIVE JSON)");
        } else {
            console2.log("  -> STATUS: SET (non-zero in LIVE JSON)");
        }
    }
}
