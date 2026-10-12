// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWCVoidMarketTokenV2 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IWCVoidMarketRecoverySuccessorV2 {
    function voidToken() external view returns (address);
    function coupledLaunchId() external view returns (bytes32);
    function predecessorVault() external view returns (address);
    function acceptRecoveredVoid(bytes32 closeoutId, uint256 amountAtoms)
        external
        returns (bytes32 acknowledgement);
}

contract WCVoidMarketVaultV2 {
    error ZeroAddress();
    error ZeroCoupledLaunchId();
    error NotLaunchController();
    error NotSettlementExecutor();
    error NotCloseoutController();
    error CoupledLaunchIdMismatch();
    error AlreadyActivated();
    error NotActivated();
    error MarketClosing();
    error MarketClosed();
    error OpeningInventoryNotExact(uint256 observedAtoms);
    error ZeroSettlementId();
    error ZeroRecipient();
    error InvalidAmount();
    error AlreadySettled(bytes32 settlementId);
    error InsufficientVoidReserve(uint256 availableAtoms, uint256 requestedAtoms);
    error TokenTransferFailed();
    error ZeroCloseoutId();
    error InvalidSuccessor();
    error CloseoutAlreadyProposed();
    error CloseoutNotProposed();
    error CloseoutProposalMismatch();
    error CloseoutAlreadyApproved();
    error CloseoutNotApproved();
    error SuccessorLineageMismatch();
    error RecoveryAcknowledgementMismatch();

    uint256 public constant openingInventoryAtoms = 10_000_000 ether;
    bytes32 public constant recoveryAcknowledgement =
        keccak256("VOID_WC_VOID_RECOVERY_ACCEPTED_V2");

    IWCVoidMarketTokenV2 public immutable token;
    address public immutable launchController;
    address public immutable settlementExecutor;
    address public immutable closeoutController;
    bytes32 public immutable coupledLaunchId;

    bool public activated;
    bool public closing;
    bool public closed;
    bool public closeoutApproved;
    uint256 public activatedAtBlock;
    uint256 public settlementCount;
    uint256 public lifetimeVoidOutAtoms;

    bytes32 public pendingCloseoutId;
    address public pendingSuccessorVault;

    mapping(bytes32 => bool) private _settled;

    event Activated(
        bytes32 indexed coupledLaunchId,
        uint256 openingInventoryAtoms,
        uint256 activatedAtBlock
    );

    event VoidSettlement(
        bytes32 indexed coupledLaunchId,
        bytes32 indexed settlementId,
        address indexed recipient,
        uint256 amountAtoms,
        uint256 reserveAfterAtoms,
        uint256 settledAtBlock
    );

    event CloseoutProposed(
        bytes32 indexed coupledLaunchId,
        bytes32 indexed closeoutId,
        address indexed successorVault,
        uint256 reserveAtoms,
        uint256 proposedAtBlock
    );

    event CloseoutApproved(
        bytes32 indexed coupledLaunchId,
        bytes32 indexed closeoutId,
        address indexed successorVault,
        uint256 approvedAtBlock
    );

    event Closed(
        bytes32 indexed coupledLaunchId,
        bytes32 indexed closeoutId,
        address indexed successorVault,
        uint256 transferredAtoms,
        uint256 closedAtBlock
    );

    constructor(
        address voidToken_,
        address launchController_,
        address settlementExecutor_,
        address closeoutController_,
        bytes32 coupledLaunchId_
    ) {
        if (
            voidToken_ == address(0) ||
            launchController_ == address(0) ||
            settlementExecutor_ == address(0) ||
            closeoutController_ == address(0)
        ) {
            revert ZeroAddress();
        }
        if (coupledLaunchId_ == bytes32(0)) revert ZeroCoupledLaunchId();

        token = IWCVoidMarketTokenV2(voidToken_);
        launchController = launchController_;
        settlementExecutor = settlementExecutor_;
        closeoutController = closeoutController_;
        coupledLaunchId = coupledLaunchId_;
    }

    function voidToken() external view returns (address) {
        return address(token);
    }

    function currentVoidReserveAtoms() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function isSettled(bytes32 settlementId) external view returns (bool) {
        return _settled[settlementId];
    }

    function activate(bytes32 launchId) external {
        if (msg.sender != launchController) revert NotLaunchController();
        if (launchId != coupledLaunchId) revert CoupledLaunchIdMismatch();
        if (activated) revert AlreadyActivated();
        if (closed) revert MarketClosed();

        uint256 observed = currentVoidReserveAtoms();
        if (observed != openingInventoryAtoms) {
            revert OpeningInventoryNotExact(observed);
        }

        activated = true;
        activatedAtBlock = block.number;

        emit Activated(launchId, observed, block.number);
    }

    function settleVoid(
        bytes32 launchId,
        bytes32 settlementId,
        address recipient,
        uint256 amountAtoms
    ) external {
        if (msg.sender != settlementExecutor) revert NotSettlementExecutor();
        if (!activated) revert NotActivated();
        if (closing) revert MarketClosing();
        if (closed) revert MarketClosed();
        if (launchId != coupledLaunchId) revert CoupledLaunchIdMismatch();
        if (settlementId == bytes32(0)) revert ZeroSettlementId();
        if (recipient == address(0)) revert ZeroRecipient();
        if (amountAtoms == 0) revert InvalidAmount();
        if (_settled[settlementId]) revert AlreadySettled(settlementId);

        uint256 available = currentVoidReserveAtoms();
        if (amountAtoms > available) {
            revert InsufficientVoidReserve(available, amountAtoms);
        }

        _settled[settlementId] = true;
        settlementCount += 1;
        lifetimeVoidOutAtoms += amountAtoms;

        bool transferred = token.transfer(recipient, amountAtoms);
        if (!transferred) revert TokenTransferFailed();

        emit VoidSettlement(
            launchId,
            settlementId,
            recipient,
            amountAtoms,
            currentVoidReserveAtoms(),
            block.number
        );
    }

    function proposeCloseout(
        bytes32 launchId,
        bytes32 closeoutId,
        address successorVault
    ) external {
        if (msg.sender != closeoutController) revert NotCloseoutController();
        if (!activated) revert NotActivated();
        if (closed) revert MarketClosed();
        if (closing) revert CloseoutAlreadyProposed();
        if (launchId != coupledLaunchId) revert CoupledLaunchIdMismatch();
        if (closeoutId == bytes32(0)) revert ZeroCloseoutId();
        if (
            successorVault == address(0) ||
            successorVault == address(this) ||
            successorVault.code.length == 0
        ) {
            revert InvalidSuccessor();
        }

        _requireSuccessorLineage(successorVault);

        pendingCloseoutId = closeoutId;
        pendingSuccessorVault = successorVault;
        closeoutApproved = false;
        closing = true;

        emit CloseoutProposed(
            launchId,
            closeoutId,
            successorVault,
            currentVoidReserveAtoms(),
            block.number
        );
    }

    function approveCloseout(
        bytes32 launchId,
        bytes32 closeoutId,
        address successorVault
    ) external {
        if (msg.sender != settlementExecutor) revert NotSettlementExecutor();
        if (!closing) revert CloseoutNotProposed();
        if (closed) revert MarketClosed();
        if (launchId != coupledLaunchId) revert CoupledLaunchIdMismatch();
        _requirePendingCloseout(closeoutId, successorVault);
        if (closeoutApproved) revert CloseoutAlreadyApproved();

        _requireSuccessorLineage(successorVault);

        closeoutApproved = true;

        emit CloseoutApproved(
            launchId,
            closeoutId,
            successorVault,
            block.number
        );
    }

    function executeCloseout(
        bytes32 launchId,
        bytes32 closeoutId,
        address successorVault
    ) external {
        if (msg.sender != closeoutController) revert NotCloseoutController();
        if (!closing) revert CloseoutNotProposed();
        if (closed) revert MarketClosed();
        if (!closeoutApproved) revert CloseoutNotApproved();
        if (launchId != coupledLaunchId) revert CoupledLaunchIdMismatch();
        _requirePendingCloseout(closeoutId, successorVault);
        _requireSuccessorLineage(successorVault);

        uint256 reserveAtoms = currentVoidReserveAtoms();

        closed = true;
        closing = false;

        if (reserveAtoms != 0) {
            bool transferred = token.transfer(successorVault, reserveAtoms);
            if (!transferred) revert TokenTransferFailed();
        }

        bytes32 acknowledgement =
            IWCVoidMarketRecoverySuccessorV2(successorVault)
                .acceptRecoveredVoid(closeoutId, reserveAtoms);
        if (acknowledgement != recoveryAcknowledgement) {
            revert RecoveryAcknowledgementMismatch();
        }

        emit Closed(
            launchId,
            closeoutId,
            successorVault,
            reserveAtoms,
            block.number
        );
    }

    function _requirePendingCloseout(
        bytes32 closeoutId,
        address successorVault
    ) internal view {
        if (
            closeoutId == bytes32(0) ||
            closeoutId != pendingCloseoutId ||
            successorVault != pendingSuccessorVault
        ) {
            revert CloseoutProposalMismatch();
        }
    }

    function _requireSuccessorLineage(address successorVault) internal view {
        IWCVoidMarketRecoverySuccessorV2 successor =
            IWCVoidMarketRecoverySuccessorV2(successorVault);

        try successor.voidToken() returns (address successorToken) {
            if (successorToken != address(token)) {
                revert SuccessorLineageMismatch();
            }
        } catch {
            revert SuccessorLineageMismatch();
        }

        try successor.coupledLaunchId() returns (bytes32 successorLaunchId) {
            if (successorLaunchId != coupledLaunchId) {
                revert SuccessorLineageMismatch();
            }
        } catch {
            revert SuccessorLineageMismatch();
        }

        try successor.predecessorVault() returns (address predecessor) {
            if (predecessor != address(this)) {
                revert SuccessorLineageMismatch();
            }
        } catch {
            revert SuccessorLineageMismatch();
        }
    }
}
