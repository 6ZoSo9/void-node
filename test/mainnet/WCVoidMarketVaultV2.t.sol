// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/WCVoidMarketVaultV2.sol";

contract WCVoidMarketMockTokenV2 {
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

contract WCVoidMarketExecutorV2 {
    function settle(
        WCVoidMarketVaultV2 vault,
        bytes32 launchId,
        bytes32 settlementId,
        address recipient,
        uint256 amountAtoms
    ) external {
        vault.settleVoid(launchId, settlementId, recipient, amountAtoms);
    }

    function approveCloseout(
        WCVoidMarketVaultV2 vault,
        bytes32 launchId,
        bytes32 closeoutId,
        address successorVault
    ) external {
        vault.approveCloseout(launchId, closeoutId, successorVault);
    }
}

contract WCVoidMarketRecoverySuccessorMockV2 {
    bytes32 internal constant ACK =
        keccak256("VOID_WC_VOID_RECOVERY_ACCEPTED_V2");

    address public immutable voidToken;
    bytes32 public immutable coupledLaunchId;
    address public immutable predecessorVault;

    bool public failAcknowledgement;
    bytes32 public acceptedCloseoutId;
    uint256 public acceptedAmountAtoms;
    uint256 public acceptCount;

    constructor(
        address token_,
        bytes32 launchId_,
        address predecessor_
    ) {
        voidToken = token_;
        coupledLaunchId = launchId_;
        predecessorVault = predecessor_;
    }

    function setFailAcknowledgement(bool value) external {
        failAcknowledgement = value;
    }

    function acceptRecoveredVoid(bytes32 closeoutId, uint256 amountAtoms)
        external
        returns (bytes32)
    {
        require(msg.sender == predecessorVault, "not_predecessor");
        require(acceptedCloseoutId == bytes32(0), "already_accepted");
        acceptedCloseoutId = closeoutId;
        acceptedAmountAtoms = amountAtoms;
        acceptCount += 1;
        return failAcknowledgement ? bytes32(uint256(1)) : ACK;
    }
}

contract WCVoidMarketWrongSuccessorMockV2 {
    address public immutable voidToken;
    bytes32 public immutable coupledLaunchId;
    address public immutable predecessorVault;

    constructor(address token_, bytes32 launchId_, address predecessor_) {
        voidToken = token_;
        coupledLaunchId = launchId_;
        predecessorVault = predecessor_;
    }

    function acceptRecoveredVoid(bytes32, uint256)
        external
        pure
        returns (bytes32)
    {
        return keccak256("VOID_WC_VOID_RECOVERY_ACCEPTED_V2");
    }
}

contract WCVoidMarketUnauthorizedV2 {
    function propose(
        WCVoidMarketVaultV2 vault,
        bytes32 launchId,
        bytes32 closeoutId,
        address successor
    ) external {
        vault.proposeCloseout(launchId, closeoutId, successor);
    }

    function execute(
        WCVoidMarketVaultV2 vault,
        bytes32 launchId,
        bytes32 closeoutId,
        address successor
    ) external {
        vault.executeCloseout(launchId, closeoutId, successor);
    }
}

contract WCVoidMarketVaultV2Test {
    uint256 internal constant CAP = 10_000_000 ether;
    bytes32 internal constant LAUNCH =
        keccak256("void:presale-wc-void:launch:v2");
    bytes32 internal constant OTHER_LAUNCH =
        keccak256("void:other-launch");
    bytes32 internal constant SETTLEMENT_A =
        keccak256("wc-void:v2:settlement:a");
    bytes32 internal constant SETTLEMENT_B =
        keccak256("wc-void:v2:settlement:b");
    bytes32 internal constant CLOSEOUT_A =
        keccak256("wc-void:v2:closeout:a");
    bytes32 internal constant CLOSEOUT_B =
        keccak256("wc-void:v2:closeout:b");

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _deploy()
        internal
        returns (
            WCVoidMarketMockTokenV2 token,
            WCVoidMarketExecutorV2 executor,
            WCVoidMarketVaultV2 vault
        )
    {
        token = new WCVoidMarketMockTokenV2();
        executor = new WCVoidMarketExecutorV2();
        vault = new WCVoidMarketVaultV2(
            address(token),
            address(this),
            address(executor),
            address(this),
            LAUNCH
        );
    }

    function _fundActivate(
        WCVoidMarketMockTokenV2 token,
        WCVoidMarketVaultV2 vault
    ) internal {
        token.mint(address(vault), CAP);
        vault.activate(LAUNCH);
    }

    function _successor(
        WCVoidMarketMockTokenV2 token,
        WCVoidMarketVaultV2 vault
    ) internal returns (WCVoidMarketRecoverySuccessorMockV2) {
        return new WCVoidMarketRecoverySuccessorMockV2(
            address(token),
            LAUNCH,
            address(vault)
        );
    }

    function test_activationStillRequiresExactOpeningInventory() public {
        (WCVoidMarketMockTokenV2 token,, WCVoidMarketVaultV2 vault) =
            _deploy();

        token.mint(address(vault), CAP - 1);
        try vault.activate(LAUNCH) {
            revert("underfunded_activation_accepted");
        } catch {}

        token.mint(address(vault), 1);
        vault.activate(LAUNCH);

        _assert(vault.activated(), "vault_not_activated");
        _assert(vault.currentVoidReserveAtoms() == CAP, "opening_reserve_wrong");
    }

    function test_closeoutCannotBeProposedBeforeActivation() public {
        (WCVoidMarketMockTokenV2 token,, WCVoidMarketVaultV2 vault) =
            _deploy();
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);

        try vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor)) {
            revert("preactivation_closeout_accepted");
        } catch {}

        _assert(!vault.closing(), "preactivation_closeout_started");
    }

    function test_onlyCloseoutControllerCanProposeOrExecute() public {
        (WCVoidMarketMockTokenV2 token, WCVoidMarketExecutorV2 executor, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);
        WCVoidMarketUnauthorizedV2 unauthorized =
            new WCVoidMarketUnauthorizedV2();

        try unauthorized.propose(vault, LAUNCH, CLOSEOUT_A, address(successor)) {
            revert("unauthorized_proposal_accepted");
        } catch {}

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));
        executor.approveCloseout(vault, LAUNCH, CLOSEOUT_A, address(successor));

        try unauthorized.execute(vault, LAUNCH, CLOSEOUT_A, address(successor)) {
            revert("unauthorized_execution_accepted");
        } catch {}

        _assert(!vault.closed(), "unauthorized_execution_closed");
        _assert(vault.currentVoidReserveAtoms() == CAP, "unauthorized_moved_reserve");
    }

    function test_proposalImmediatelyFreezesNewSettlement() public {
        (WCVoidMarketMockTokenV2 token, WCVoidMarketExecutorV2 executor, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);

        executor.settle(
            vault,
            LAUNCH,
            SETTLEMENT_A,
            address(0xA11CE),
            1 ether
        );

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));

        try executor.settle(
            vault,
            LAUNCH,
            SETTLEMENT_B,
            address(0xBEEF),
            1 ether
        ) {
            revert("settlement_after_freeze_accepted");
        } catch {}

        _assert(vault.closing(), "closing_not_set");
        _assert(!vault.closed(), "prematurely_closed");
        _assert(!vault.isSettled(SETTLEMENT_B), "frozen_settlement_consumed");
    }

    function test_closeoutRequiresIndependentSettlementExecutorApproval() public {
        (WCVoidMarketMockTokenV2 token,, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));

        try vault.executeCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(successor)
        ) {
            revert("unapproved_closeout_executed");
        } catch {}

        _assert(!vault.closed(), "unapproved_closeout_closed");
        _assert(vault.closing(), "unapproved_closeout_unfroze");
        _assert(vault.currentVoidReserveAtoms() == CAP, "unapproved_moved_reserve");
    }

    function test_onlySettlementExecutorCanApproveExactProposal() public {
        (WCVoidMarketMockTokenV2 token, WCVoidMarketExecutorV2 executor, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));

        try vault.approveCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(successor)
        ) {
            revert("controller_self_approved");
        } catch {}

        try executor.approveCloseout(
            vault,
            LAUNCH,
            CLOSEOUT_B,
            address(successor)
        ) {
            revert("wrong_closeout_id_approved");
        } catch {}

        executor.approveCloseout(vault, LAUNCH, CLOSEOUT_A, address(successor));
        _assert(vault.closeoutApproved(), "exact_approval_missing");
    }

    function test_successorMustMatchTokenLaunchAndPredecessor() public {
        (WCVoidMarketMockTokenV2 token,, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);

        WCVoidMarketWrongSuccessorMockV2 wrongLaunch =
            new WCVoidMarketWrongSuccessorMockV2(
                address(token),
                OTHER_LAUNCH,
                address(vault)
            );
        try vault.proposeCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(wrongLaunch)
        ) {
            revert("wrong_launch_successor_accepted");
        } catch {}

        WCVoidMarketMockTokenV2 otherToken =
            new WCVoidMarketMockTokenV2();
        WCVoidMarketWrongSuccessorMockV2 wrongToken =
            new WCVoidMarketWrongSuccessorMockV2(
                address(otherToken),
                LAUNCH,
                address(vault)
            );
        try vault.proposeCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(wrongToken)
        ) {
            revert("wrong_token_successor_accepted");
        } catch {}

        WCVoidMarketWrongSuccessorMockV2 wrongPredecessor =
            new WCVoidMarketWrongSuccessorMockV2(
                address(token),
                LAUNCH,
                address(0xBEEF)
            );
        try vault.proposeCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(wrongPredecessor)
        ) {
            revert("wrong_predecessor_successor_accepted");
        } catch {}

        _assert(!vault.closing(), "invalid_successor_started_closeout");
    }

    function test_closeoutProposalCannotBeReplacedOrCancelled() public {
        (WCVoidMarketMockTokenV2 token,, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 replacement =
            _successor(token, vault);

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));

        try vault.proposeCloseout(
            LAUNCH,
            CLOSEOUT_B,
            address(replacement)
        ) {
            revert("proposal_replacement_accepted");
        } catch {}

        _assert(vault.pendingCloseoutId() == CLOSEOUT_A, "proposal_id_changed");
        _assert(
            vault.pendingSuccessorVault() == address(successor),
            "proposal_successor_changed"
        );
        _assert(vault.closing(), "proposal_unfrozen");
    }

    function test_failedRecoveryAcknowledgementRollsBackEntireCloseout() public {
        (WCVoidMarketMockTokenV2 token, WCVoidMarketExecutorV2 executor, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);
        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);
        successor.setFailAcknowledgement(true);

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));
        executor.approveCloseout(vault, LAUNCH, CLOSEOUT_A, address(successor));

        try vault.executeCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(successor)
        ) {
            revert("bad_ack_closeout_accepted");
        } catch {}

        _assert(!vault.closed(), "bad_ack_closed");
        _assert(vault.closing(), "bad_ack_unfroze");
        _assert(vault.closeoutApproved(), "bad_ack_lost_approval");
        _assert(vault.currentVoidReserveAtoms() == CAP, "bad_ack_moved_reserve");
        _assert(token.balanceOf(address(successor)) == 0, "bad_ack_successor_kept_void");
        _assert(successor.acceptCount() == 0, "bad_ack_side_effect_persisted");
    }

    function test_successfulCloseoutMovesEntireLiveReserveOnce() public {
        (WCVoidMarketMockTokenV2 token, WCVoidMarketExecutorV2 executor, WCVoidMarketVaultV2 vault) =
            _deploy();
        _fundActivate(token, vault);

        executor.settle(
            vault,
            LAUNCH,
            SETTLEMENT_A,
            address(0xA11CE),
            1_000_000 ether
        );
        token.mint(address(vault), 250_000 ether);

        uint256 expectedReserve = 9_250_000 ether;
        _assert(
            vault.currentVoidReserveAtoms() == expectedReserve,
            "precloseout_reserve_wrong"
        );

        WCVoidMarketRecoverySuccessorMockV2 successor =
            _successor(token, vault);

        vault.proposeCloseout(LAUNCH, CLOSEOUT_A, address(successor));
        executor.approveCloseout(vault, LAUNCH, CLOSEOUT_A, address(successor));
        vault.executeCloseout(LAUNCH, CLOSEOUT_A, address(successor));

        _assert(vault.closed(), "vault_not_closed");
        _assert(!vault.closing(), "vault_still_closing");
        _assert(vault.currentVoidReserveAtoms() == 0, "source_reserve_not_zero");
        _assert(
            token.balanceOf(address(successor)) == expectedReserve,
            "successor_reserve_wrong"
        );
        _assert(
            successor.acceptedCloseoutId() == CLOSEOUT_A,
            "successor_closeout_id_wrong"
        );
        _assert(
            successor.acceptedAmountAtoms() == expectedReserve,
            "successor_amount_wrong"
        );
        _assert(successor.acceptCount() == 1, "successor_accept_count_wrong");

        try vault.executeCloseout(
            LAUNCH,
            CLOSEOUT_A,
            address(successor)
        ) {
            revert("second_closeout_accepted");
        } catch {}

        try executor.settle(
            vault,
            LAUNCH,
            SETTLEMENT_B,
            address(0xBEEF),
            1
        ) {
            revert("postcloseout_settlement_accepted");
        } catch {}
    }
}
