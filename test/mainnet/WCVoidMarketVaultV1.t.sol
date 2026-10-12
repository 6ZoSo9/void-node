// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/WCVoidMarketVaultV1.sol";

contract WCVoidMarketMockTokenV1 {
    mapping(address => uint256) public balanceOf;
    bool public failTransfers;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setFailTransfers(bool value) external {
        failTransfers = value;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfers) return false;
        require(balanceOf[msg.sender] >= amount, "insufficient_balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }
}

contract WCVoidMarketParticipantV1 {
    function returnVoid(
        WCVoidMarketMockTokenV1 token,
        address vault,
        uint256 amount
    ) external {
        require(token.transfer(vault, amount), "return_failed");
    }
}

contract WCVoidMarketUnauthorizedCallerV1 {
    function callActivate(WCVoidMarketVaultV1 vault, bytes32 launchId) external {
        vault.activate(launchId);
    }

    function callSettle(
        WCVoidMarketVaultV1 vault,
        bytes32 launchId,
        bytes32 settlementId,
        address recipient,
        uint256 amount
    ) external {
        vault.settleVoid(launchId, settlementId, recipient, amount);
    }
}

contract WCVoidMarketVaultV1Test {
    uint256 internal constant CAP = 10_000_000 ether;
    bytes32 internal constant LAUNCH = keccak256("void:presale-wc-void:launch:v1");
    bytes32 internal constant OTHER_LAUNCH = keccak256("void:other-launch");
    bytes32 internal constant SETTLEMENT_A = keccak256("wc-void:settlement:a");
    bytes32 internal constant SETTLEMENT_B = keccak256("wc-void:settlement:b");

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _deploy()
        internal
        returns (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault)
    {
        token = new WCVoidMarketMockTokenV1();
        vault = new WCVoidMarketVaultV1(
            address(token),
            address(this),
            address(this),
            LAUNCH
        );
    }

    function _fundAndActivate(
        WCVoidMarketMockTokenV1 token,
        WCVoidMarketVaultV1 vault
    ) internal {
        token.mint(address(vault), CAP);
        vault.activate(LAUNCH);
    }

    function test_activationRequiresExactTenMillionVoidAndIsOneShot() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();

        token.mint(address(vault), CAP - 1);
        try vault.activate(LAUNCH) {
            revert("underfunded_activation_accepted");
        } catch {}
        _assert(!vault.activated(), "underfunded_vault_activated");

        token.mint(address(vault), 1);
        vault.activate(LAUNCH);
        _assert(vault.activated(), "exact_inventory_not_activated");
        _assert(vault.activatedAtBlock() == block.number, "activation_block_mismatch");
        _assert(vault.currentVoidReserveAtoms() == CAP, "opening_inventory_mismatch");

        try vault.activate(LAUNCH) {
            revert("second_activation_accepted");
        } catch {}
    }

    function test_overfundedOpeningFailsClosed() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        token.mint(address(vault), CAP + 1);

        try vault.activate(LAUNCH) {
            revert("overfunded_activation_accepted");
        } catch {}

        _assert(!vault.activated(), "overfunded_vault_activated");
        _assert(vault.currentVoidReserveAtoms() == CAP + 1, "overfunded_balance_changed");
    }

    function test_activationRequiresFixedControllerAndCoupledLaunchId() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        token.mint(address(vault), CAP);

        try vault.activate(OTHER_LAUNCH) {
            revert("wrong_launch_activated");
        } catch {}

        WCVoidMarketUnauthorizedCallerV1 caller =
            new WCVoidMarketUnauthorizedCallerV1();
        try caller.callActivate(vault, LAUNCH) {
            revert("unauthorized_activation_accepted");
        } catch {}

        _assert(!vault.activated(), "unauthorized_vault_activated");
        vault.activate(LAUNCH);
        _assert(vault.activated(), "authorized_activation_failed");
    }

    function test_settlementCannotRunBeforeActivation() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        token.mint(address(vault), CAP);

        try vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xBEEF), 1 ether) {
            revert("preactivation_settlement_accepted");
        } catch {}

        _assert(!vault.isSettled(SETTLEMENT_A), "preactivation_settlement_recorded");
        _assert(token.balanceOf(address(0xBEEF)) == 0, "preactivation_transfer");
    }

    function test_exactSettlementTransfersAndCannotReplay() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        _fundAndActivate(token, vault);

        vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xBEEF), 2 ether);

        _assert(vault.isSettled(SETTLEMENT_A), "settlement_not_recorded");
        _assert(vault.settlementCount() == 1, "settlement_count_mismatch");
        _assert(vault.lifetimeVoidOutAtoms() == 2 ether, "lifetime_out_mismatch");
        _assert(token.balanceOf(address(0xBEEF)) == 2 ether, "recipient_balance_mismatch");
        _assert(vault.currentVoidReserveAtoms() == CAP - 2 ether, "reserve_mismatch");

        try vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xCAFE), 3 ether) {
            revert("duplicate_settlement_accepted");
        } catch {}

        _assert(token.balanceOf(address(0xCAFE)) == 0, "duplicate_transferred");
        _assert(vault.settlementCount() == 1, "duplicate_changed_count");
        _assert(vault.lifetimeVoidOutAtoms() == 2 ether, "duplicate_changed_lifetime");
    }

    function test_onlySettlementExecutorAndExactLaunchCanSettle() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        _fundAndActivate(token, vault);

        try vault.settleVoid(OTHER_LAUNCH, SETTLEMENT_A, address(0xBEEF), 1 ether) {
            revert("wrong_launch_settlement_accepted");
        } catch {}

        WCVoidMarketUnauthorizedCallerV1 caller =
            new WCVoidMarketUnauthorizedCallerV1();
        try caller.callSettle(
            vault,
            LAUNCH,
            SETTLEMENT_A,
            address(0xBEEF),
            1 ether
        ) {
            revert("unauthorized_settlement_accepted");
        } catch {}

        _assert(!vault.isSettled(SETTLEMENT_A), "unauthorized_settlement_recorded");
        _assert(token.balanceOf(address(0xBEEF)) == 0, "unauthorized_transfer");
    }

    function test_failedTransferRollsBackSettlementIdentityAndCounters() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        _fundAndActivate(token, vault);
        token.setFailTransfers(true);

        try vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xBEEF), 2 ether) {
            revert("failed_transfer_accepted");
        } catch {}

        _assert(!vault.isSettled(SETTLEMENT_A), "failed_transfer_consumed_id");
        _assert(vault.settlementCount() == 0, "failed_transfer_changed_count");
        _assert(vault.lifetimeVoidOutAtoms() == 0, "failed_transfer_changed_lifetime");
        _assert(vault.currentVoidReserveAtoms() == CAP, "failed_transfer_changed_reserve");

        token.setFailTransfers(false);
        vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xBEEF), 2 ether);
        _assert(vault.isSettled(SETTLEMENT_A), "retry_not_settled");
    }

    function test_cannotSettleMoreThanLiveReserve() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        _fundAndActivate(token, vault);

        try vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xBEEF), CAP + 1) {
            revert("reserve_overdraw_accepted");
        } catch {}

        _assert(!vault.isSettled(SETTLEMENT_A), "overdraw_consumed_id");
        _assert(vault.currentVoidReserveAtoms() == CAP, "overdraw_changed_reserve");
    }

    function test_returnedVoidCanBeSettledAgainWithoutLifetimeCap() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        _fundAndActivate(token, vault);

        WCVoidMarketParticipantV1 participant = new WCVoidMarketParticipantV1();

        vault.settleVoid(
            LAUNCH,
            SETTLEMENT_A,
            address(participant),
            1_000_000 ether
        );
        _assert(
            vault.currentVoidReserveAtoms() == 9_000_000 ether,
            "first_sale_reserve_mismatch"
        );

        participant.returnVoid(token, address(vault), 500_000 ether);
        _assert(
            vault.currentVoidReserveAtoms() == 9_500_000 ether,
            "returned_void_not_reflected"
        );

        vault.settleVoid(
            LAUNCH,
            SETTLEMENT_B,
            address(0xBEEF),
            9_500_000 ether
        );

        _assert(vault.currentVoidReserveAtoms() == 0, "final_reserve_nonzero");
        _assert(
            vault.lifetimeVoidOutAtoms() == 10_500_000 ether,
            "lifetime_outflow_wrong"
        );
        _assert(vault.settlementCount() == 2, "settlement_count_wrong");
    }

    function test_zeroInputsFailClosed() public {
        (WCVoidMarketMockTokenV1 token, WCVoidMarketVaultV1 vault) = _deploy();
        _fundAndActivate(token, vault);

        try vault.settleVoid(LAUNCH, bytes32(0), address(0xBEEF), 1 ether) {
            revert("zero_settlement_id_accepted");
        } catch {}
        try vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0), 1 ether) {
            revert("zero_recipient_accepted");
        } catch {}
        try vault.settleVoid(LAUNCH, SETTLEMENT_A, address(0xBEEF), 0) {
            revert("zero_amount_accepted");
        } catch {}

        _assert(vault.settlementCount() == 0, "zero_input_changed_count");
        _assert(vault.currentVoidReserveAtoms() == CAP, "zero_input_changed_reserve");
    }
}
