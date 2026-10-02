// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/WCVoidMarketVaultV2.sol";
import "../../contracts/epoch2/VoidEpoch2TokenV1.sol";

interface VmWCVoidGasCensusV1 {
    function prank(address msgSender) external;
    function snapshotGasLastCall(string calldata name)
        external
        returns (uint256 gasUsed);
}

abstract contract WCVoidMarketVaultV2GasCensusBase {
    VmWCVoidGasCensusV1 internal constant vm =
        VmWCVoidGasCensusV1(
            address(uint160(uint256(keccak256("hevm cheat code"))))
        );

    uint256 internal constant CAP = 10_000_000 ether;
    uint256 internal constant SIGNED_INTENT_MAX_GAS = 3_000_000;

    address internal constant TOKEN_OWNER =
        0x54ded2DAA618a257093556A5F54c43805b9BD516;
    address internal constant EXECUTOR = address(0xE2050);
    address internal constant RECIPIENT_A = address(0xA11CE);
    address internal constant RECIPIENT_B = address(0xB0B);

    bytes32 internal constant LAUNCH =
        keccak256("void:presale-wc-void:launch:v2");
    bytes32 internal constant SETTLEMENT_A =
        keccak256("wc-void:v2:gas-census:settlement:a");
    bytes32 internal constant SETTLEMENT_B =
        keccak256("wc-void:v2:gas-census:settlement:b");

    VoidEpoch2TokenV1 internal token;
    WCVoidMarketVaultV2 internal vault;

    event log_named_uint(string key, uint256 value);

    function setUp() public virtual {
        token = new VoidEpoch2TokenV1();
        vault = new WCVoidMarketVaultV2(
            address(token),
            address(this),
            EXECUTOR,
            address(this),
            LAUNCH
        );

        vm.prank(TOKEN_OWNER);
        token.mint(address(vault), CAP);
        vault.activate(LAUNCH);

        require(vault.activated(), "gas_census_vault_not_activated");
        require(
            token.balanceOf(address(vault)) == CAP,
            "gas_census_opening_inventory_mismatch"
        );
    }

    function _intrinsicGas(bytes memory callData)
        internal
        pure
        returns (uint256 gasUsed)
    {
        // Legacy/EIP-1559 transaction intrinsic gas under the Paris schedule:
        // 21,000 base + 4 per zero calldata byte + 16 per non-zero byte.
        gasUsed = 21_000;
        for (uint256 i = 0; i < callData.length; i += 1) {
            gasUsed += callData[i] == bytes1(0) ? 4 : 16;
        }
    }

    function _measure(
        string memory snapshotName,
        bytes32 settlementId,
        address recipient,
        uint256 amountAtoms
    )
        internal
        returns (
            uint256 executionGas,
            uint256 intrinsicGas,
            uint256 measuredTransactionGas
        )
    {
        bytes memory callData = abi.encodeCall(
            WCVoidMarketVaultV2.settleVoid,
            (LAUNCH, settlementId, recipient, amountAtoms)
        );
        intrinsicGas = _intrinsicGas(callData);

        vm.prank(EXECUTOR);
        vault.settleVoid(LAUNCH, settlementId, recipient, amountAtoms);

        // Foundry reports the previous external call from the callee
        // perspective, excluding this test contract's caller-side CALL
        // envelope. This is the execution component relevant to an EOA
        // transaction targeting settleVoid directly.
        executionGas = vm.snapshotGasLastCall(snapshotName);
        measuredTransactionGas = executionGas + intrinsicGas;

        require(executionGas > 0, "gas_census_execution_zero");
        require(
            measuredTransactionGas < SIGNED_INTENT_MAX_GAS,
            "gas_census_exceeds_signed_intent_max"
        );
    }

    function _emitMeasurement(
        string memory prefix,
        uint256 executionGas,
        uint256 intrinsicGas,
        uint256 measuredTransactionGas
    ) internal {
        emit log_named_uint(
            string.concat(prefix, "_execution_gas"),
            executionGas
        );
        emit log_named_uint(
            string.concat(prefix, "_intrinsic_gas"),
            intrinsicGas
        );
        emit log_named_uint(
            string.concat(prefix, "_measured_tx_gas"),
            measuredTransactionGas
        );
        emit log_named_uint(
            string.concat(prefix, "_signed_intent_max_gas"),
            SIGNED_INTENT_MAX_GAS
        );
    }
}

contract WCVoidMarketVaultV2FirstSettlementGasCensusTest is
    WCVoidMarketVaultV2GasCensusBase
{
    function test_measureFirstSettlementToFreshRecipient() public {
        (
            uint256 executionGas,
            uint256 intrinsicGas,
            uint256 measuredTransactionGas
        ) = _measure(
            "settle_void_first",
            SETTLEMENT_A,
            RECIPIENT_A,
            1 ether
        );

        require(vault.settlementCount() == 1, "first_settlement_count_wrong");
        require(vault.isSettled(SETTLEMENT_A), "first_settlement_not_recorded");
        require(
            token.balanceOf(RECIPIENT_A) == 1 ether,
            "first_recipient_balance_wrong"
        );

        _emitMeasurement(
            "settle_void_first",
            executionGas,
            intrinsicGas,
            measuredTransactionGas
        );
    }
}

contract WCVoidMarketVaultV2SubsequentSettlementGasCensusTest is
    WCVoidMarketVaultV2GasCensusBase
{
    function setUp() public override {
        super.setUp();

        // Foundry persists setUp state into the test snapshot, then executes
        // the test call separately. This creates a subsequent-settlement
        // storage prestate while the measured test starts with a fresh
        // transaction access set.
        vm.prank(EXECUTOR);
        vault.settleVoid(LAUNCH, SETTLEMENT_A, RECIPIENT_A, 1 ether);

        require(vault.settlementCount() == 1, "prime_settlement_count_wrong");
        require(vault.isSettled(SETTLEMENT_A), "prime_settlement_not_recorded");
    }

    function test_measureSubsequentSettlementToFreshRecipient() public {
        (
            uint256 executionGas,
            uint256 intrinsicGas,
            uint256 measuredTransactionGas
        ) = _measure(
            "settle_void_subsequent",
            SETTLEMENT_B,
            RECIPIENT_B,
            1 ether
        );

        require(
            vault.settlementCount() == 2,
            "subsequent_settlement_count_wrong"
        );
        require(
            vault.isSettled(SETTLEMENT_B),
            "subsequent_settlement_not_recorded"
        );
        require(
            token.balanceOf(RECIPIENT_B) == 1 ether,
            "subsequent_recipient_balance_wrong"
        );

        _emitMeasurement(
            "settle_void_subsequent",
            executionGas,
            intrinsicGas,
            measuredTransactionGas
        );
    }
}
