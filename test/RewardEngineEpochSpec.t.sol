// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

/// @notice RewardEngine econ spec v1 (simplified)
/// - Asserts config/void-mainnet-rewardengine-params.json exists,
///   is non-empty, and has basic JSON-like shape.
/// - Full JSON + econ consistency is enforced by the ops pipeline:
///   void_mainnet_rewardengine_econ_json_ok / _self_consistent gauges.
contract RewardEngineEpochSpec is Test {
    function testRewardEngineParamsJsonPresentAndValid() public {
        // Resolve project root as seen by forge
        string memory root = vm.projectRoot();
        string memory path = string.concat(
            root,
            "/config/void-mainnet-rewardengine-params.json"
        );

        // 1) File must exist and be non-empty
        string memory raw = vm.readFile(path);
        bytes memory rawBytes = bytes(raw);
        assertGt(
            rawBytes.length,
            2,
            "void-mainnet-rewardengine-params.json must not be empty or trivial"
        );

        // 2) Minimal structural sanity: looks like a JSON object.
        //    We tolerate a trailing newline, so we check:
        //      - first byte is '{'
        //      - last non-newline byte is '}'
        bytes1 first = rawBytes[0];
        assertEq(first, bytes1("{"), "params JSON must start with '{'");

        // Find last non-newline character
        uint256 i = rawBytes.length;
        while (i > 0 && (rawBytes[i - 1] == "\n" || rawBytes[i - 1] == "\r")) {
            unchecked {
                i--;
            }
        }
        require(i > 0, "params JSON is only whitespace");

        bytes1 lastNonNewline = rawBytes[i - 1];
        assertEq(
            lastNonNewline,
            bytes1("}"),
            "params JSON must end with '}' before trailing newlines"
        );

        // NOTE:
        // - Full JSON validity + econ constraints are enforced out-of-band by
        //   ops/void-mainnet-rewardengine-econ-exporter.sh and the Prometheus
        //   gauges:
        //     * void_mainnet_rewardengine_econ_json_ok
        //     * void_mainnet_rewardengine_econ_self_consistent
        //   This test is just a lightweight guard that the config file is present
        //   and roughly sane from the repo's perspective.
    }
}
