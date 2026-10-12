// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWCVoidMarketTokenV1 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract WCVoidMarketVaultV1 {
    error ZeroAddress();
    error ZeroCoupledLaunchId();
    error NotLaunchController();
    error NotSettlementExecutor();
    error CoupledLaunchIdMismatch();
    error AlreadyActivated();
    error NotActivated();
    error OpeningInventoryNotExact(uint256 observedAtoms);
    error ZeroSettlementId();
    error ZeroRecipient();
    error InvalidAmount();
    error AlreadySettled(bytes32 settlementId);
    error InsufficientVoidReserve(uint256 availableAtoms, uint256 requestedAtoms);
    error TokenTransferFailed();

    uint256 public constant openingInventoryAtoms = 10_000_000 ether;

    IWCVoidMarketTokenV1 public immutable token;
    address public immutable launchController;
    address public immutable settlementExecutor;
    bytes32 public immutable coupledLaunchId;

    bool public activated;
    uint256 public activatedAtBlock;
    uint256 public settlementCount;
    uint256 public lifetimeVoidOutAtoms;

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

    constructor(
        address voidToken_,
        address launchController_,
        address settlementExecutor_,
        bytes32 coupledLaunchId_
    ) {
        if (
            voidToken_ == address(0) ||
            launchController_ == address(0) ||
            settlementExecutor_ == address(0)
        ) {
            revert ZeroAddress();
        }
        if (coupledLaunchId_ == bytes32(0)) revert ZeroCoupledLaunchId();

        token = IWCVoidMarketTokenV1(voidToken_);
        launchController = launchController_;
        settlementExecutor = settlementExecutor_;
        coupledLaunchId = coupledLaunchId_;
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
}
