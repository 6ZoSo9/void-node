// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/AdminGate.sol";

/// @notice Minimal smoke tests for AdminGate / MasterKey wiring.
/// @dev No forge-std, just bare require() so we avoid extra deps.
contract AdminGateTest {
    AdminGate private gate;

    constructor() {
        // Deploy an AdminGate where THIS test contract is the MasterKey.
        // chainId is fixed to 2050 for VOID mainnet semantics.
        gate = new AdminGate(
            2050,          // chainId
            address(this), // masterKey
            address(0)     // updateGate (none for this smoke test)
        );
    }

    function testChainIdAndMasterKey() public {
        require(gate.chainId() == 2050, "chainId mismatch");
        require(gate.masterKey() == address(this), "masterKey mismatch");
    }

    function testSetSystemContract() public {
        bytes32 key = keccak256("TEST_SYSTEM");
        address target = address(0xBEEF);

        gate.setSystemContract(key, target);

        require(
            gate.systemContracts(key) == target,
            "systemContracts not updated"
        );
    }

    function testSetMasterKey() public {
        address newMaster = address(0x1234);

        gate.setMasterKey(newMaster);

        require(
            gate.masterKey() == newMaster,
            "masterKey not updated"
        );
    }
}
