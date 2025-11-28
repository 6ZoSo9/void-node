// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/// @notice VOID mainnet bootstrap script (mainnet path).
/// @dev STUB ONLY:
///      - Parses the JSON config to read .chainId
///      - Enforces chainId == 2050 (both runtime and config)
///      - Then *always* reverts
///      This lets us wire the forge signature and config shape now
///      without any risk of accidentally broadcasting a real mainnet bootstrap.
contract VoidMainnetBootstrapMainnet is Script {
    /// @notice Minimal config header we care about for now.
    /// @dev Expected JSON shape (top-level):
    ///   {
    ///     "chainId": 2050,
    ///     "network": "void-mainnet",   // optional for now
    ///     ...
    ///   }
    struct ConfigHeader {
        uint256 chainId;
        // We ignore .network for now to avoid hard coupling to the current template.
        // string network;
    }

    /// @dev Load the top-level .chainId from the JSON config file.
    function _loadConfigHeader(string memory path) internal view returns (ConfigHeader memory cfg) {
        string memory json = vm.readFile(path);
        // This will revert if .chainId is missing or not a uint, which is what we want.
        cfg.chainId = vm.parseJsonUint(json, ".chainId");
    }

    /// @notice Main entrypoint for forge:
    ///   forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \\
    ///     --sig "run(string)" config/void-mainnet-bootstrap-mainnet.live.json
    ///
    /// @dev This is intentionally NON-FUNCTIONAL for live mainnet:
    ///      after sanity checks it always reverts.
    function run(string memory configPath) external {
        ConfigHeader memory cfg = _loadConfigHeader(configPath);

        uint256 runtimeChainId = block.chainid;

        console2.log("=== [VOID mainnet bootstrap mainnet stub] ===");
        console2.log("  runtime chainId :", runtimeChainId);
        console2.log("  config  chainId :", cfg.chainId);

        // Hard gate: this script must *only* ever run on VOID mainnet (chainId 2050).
        require(
            runtimeChainId == 2050,
            "VoidMainnetBootstrapMainnet: wrong runtime chainId (expected 2050)"
        );
        require(
            cfg.chainId == 2050,
            "VoidMainnetBootstrapMainnet: config.chainId != 2050"
        );
        require(
            cfg.chainId == runtimeChainId,
            "VoidMainnetBootstrapMainnet: config/runtime chainId mismatch"
        );

        console2.log("  chainId sanity OK; this is still a STUB (no deployments).");

        // SAFETY FUSE:
        //   Do not remove this until we are *actually* ready to implement
        //   the real mainnet bootstrap wiring and have triple-checked the plan.
        revert("VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast");
    }
}
