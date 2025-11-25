// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/ConfigGate.sol";

/// @notice Minimal smoke tests for ConfigGate (typed config + admin wiring).
/// @dev No forge-std; just bare require() so we keep deps minimal.
contract ConfigGateTest {
    ConfigGate private cfg;

    constructor() {
        // Deploy ConfigGate with VOID mainnet semantics.
        // chainId = 2050, adminGate = this test contract.
        cfg = new ConfigGate(
            2050, // chainId
            address(this) // adminGate
        );
    }

    function testChainIdAndAdminGate() public {
        require(cfg.chainId() == 2050, "chainId mismatch");
        require(cfg.adminGate() == address(this), "adminGate mismatch");
    }

    function testSetUintBoolAddress() public {
        bytes32 keyU = keccak256("WAL_MAX_PRESSURE");
        bytes32 keyB = keccak256("FEATURE_FLAG_EXAMPLE");
        bytes32 keyA = keccak256("AI_MODEL_REGISTRY");

        cfg.setUint(keyU, 42);
        cfg.setBool(keyB, true);
        cfg.setAddress(keyA, address(0xBEEF));

        require(cfg.getUint(keyU) == 42, "uintConfig mismatch");
        require(cfg.getBool(keyB) == true, "boolConfig mismatch");
        require(cfg.getAddress(keyA) == address(0xBEEF), "addressConfig mismatch");
    }

    function testSetAdminGate() public {
        address newAdmin = address(0x1234);

        cfg.setAdminGate(newAdmin);

        require(cfg.adminGate() == newAdmin, "adminGate not updated");
    }
}
