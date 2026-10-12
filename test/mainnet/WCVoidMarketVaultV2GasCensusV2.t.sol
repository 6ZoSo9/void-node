// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/WCVoidMarketVaultV2.sol";
import "../../contracts/epoch2/VoidEpoch2TokenV1.sol";

interface VmWCVoidGasCensusV2 {
    function prank(address msgSender) external;
    function snapshotGasLastCall(string calldata name)
        external
        returns (uint256 gasUsed);
}

abstract contract WCVoidMarketVaultV2GasCensusV2Base {
    VmWCVoidGasCensusV2 internal constant vm =
        VmWCVoidGasCensusV2(
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
        keccak256("wc-void:v2:gas-census-isolated:settlement:a");
    bytes32 internal constant SETTLEMENT_B =
        keccak256("wc-void:v2:gas-census-isolated:settlement:b");

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

        require(vault.activated(), "gas_census_v2_vault_not_activated");
        require(
            token.balanceOf(address(vault)) == CAP,
            "gas_census_v2_opening_inventory_mismatch"
        );
    }

    function _measureIsolatedTransaction(
        string memory snapshotName,
        bytes32 settlementId,
        address recipient,
        uint256 amountAtoms
    ) internal returns (uint256 isolatedTxGas) {
        vm.prank(EXECUTOR);
        vault.settleVoid(LAUNCH, settlementId, recipient, amountAtoms);

        // The canonical workflow MUST execute this test with forge --isolate.
        // Under isolation the last-call snapshot is the isolated transaction
        // gas observation; do not add a second manually computed intrinsic term.
        isolatedTxGas = vm.snapshotGasLastCall(snapshotName);

        require(isolatedTxGas > 0, "gas_census_v2_measurement_zero");
        require(
            isolatedTxGas < SIGNED_INTENT_MAX_GAS,
            "gas_census_v2_exceeds_signed_intent_max"
        );
    }

    function _emitMeasurement(
        string memory prefix,
        uint256 isolatedTxGas
    ) internal {
        emit log_named_uint(
            string.concat(prefix, "_isolated_tx_gas"),
            isolatedTxGas
        );
        emit log_named_uint(
            string.concat(prefix, "_signed_intent_max_gas"),
            SIGNED_INTENT_MAX_GAS
        );
    }
}

contract WCVoidMarketVaultV2FirstSettlementIsolatedGasCensusTest is
    WCVoidMarketVaultV2GasCensusV2Base
{
    function test_measureFirstSettlementToFreshRecipient() public {
        uint256 isolatedTxGas = _measureIsolatedTransaction(
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

        _emitMeasurement("settle_void_first", isolatedTxGas);
    }
}

contract WCVoidMarketVaultV2SubsequentSettlementIsolatedGasCensusTest is
    WCVoidMarketVaultV2GasCensusV2Base
{
    function setUp() public override {
        super.setUp();

        // Establish the subsequent-settlement storage prestate before the
        // measured test transaction. The measured call itself still runs under
        // the workflow's mandatory --isolate execution mode.
        vm.prank(EXECUTOR);
        vault.settleVoid(LAUNCH, SETTLEMENT_A, RECIPIENT_A, 1 ether);

        require(vault.settlementCount() == 1, "prime_settlement_count_wrong");
        require(vault.isSettled(SETTLEMENT_A), "prime_settlement_not_recorded");
    }

    function test_measureSubsequentSettlementToFreshRecipient() public {
        uint256 isolatedTxGas = _measureIsolatedTransaction(
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

        _emitMeasurement("settle_void_subsequent", isolatedTxGas);
    }
}
