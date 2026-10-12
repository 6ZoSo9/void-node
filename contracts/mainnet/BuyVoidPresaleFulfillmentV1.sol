// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBuyVoidTokenV1 {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IBuyVoidPresaleFulfillmentHistoryV1 {
    function voidToken() external view returns (address);
    function maxInventoryAtoms() external view returns (uint256);
    function totalFulfilledAtoms() external view returns (uint256);
    function isFulfilled(bytes32 paymentDeliveryId) external view returns (bool);
    function getFulfillment(bytes32 paymentDeliveryId)
        external
        view
        returns (bool fulfilled, address recipient, uint256 amountAtoms, uint256 fulfilledAtBlock);
}

contract BuyVoidPresaleFulfillmentV1 is IBuyVoidPresaleFulfillmentHistoryV1 {
    error ZeroAddress();
    error ZeroPaymentDeliveryId();
    error InvalidAmount();
    error NotFulfiller();
    error AlreadyFulfilled(bytes32 paymentDeliveryId);
    error InventoryExceeded();
    error TokenTransferFailed();
    error PredecessorMismatch();

    struct Fulfillment {
        bool fulfilled;
        address recipient;
        uint256 amountAtoms;
        uint256 fulfilledAtBlock;
    }

    uint256 public constant override maxInventoryAtoms = 10_000_000 ether;

    IBuyVoidTokenV1 public immutable token;
    address public immutable fulfiller;
    IBuyVoidPresaleFulfillmentHistoryV1 public immutable predecessor;

    mapping(bytes32 => Fulfillment) private _fulfillments;
    uint256 private _localFulfilledAtoms;

    event Fulfilled(
        bytes32 indexed paymentDeliveryId,
        address indexed recipient,
        uint256 amountAtoms,
        uint256 fulfilledAtBlock
    );

    constructor(address voidToken_, address fulfiller_, address predecessor_) {
        if (voidToken_ == address(0) || fulfiller_ == address(0)) revert ZeroAddress();

        token = IBuyVoidTokenV1(voidToken_);
        fulfiller = fulfiller_;
        predecessor = IBuyVoidPresaleFulfillmentHistoryV1(predecessor_);

        if (predecessor_ != address(0)) {
            if (
                predecessor.voidToken() != voidToken_ ||
                predecessor.maxInventoryAtoms() != maxInventoryAtoms
            ) {
                revert PredecessorMismatch();
            }
            if (predecessor.totalFulfilledAtoms() > maxInventoryAtoms) {
                revert PredecessorMismatch();
            }
        }
    }

    function voidToken() external view override returns (address) {
        return address(token);
    }

    function localFulfilledAtoms() external view returns (uint256) {
        return _localFulfilledAtoms;
    }

    function totalFulfilledAtoms() public view override returns (uint256) {
        uint256 historical = address(predecessor) == address(0)
            ? 0
            : predecessor.totalFulfilledAtoms();
        if (historical > maxInventoryAtoms) revert PredecessorMismatch();
        if (_localFulfilledAtoms > maxInventoryAtoms - historical) {
            revert PredecessorMismatch();
        }
        return historical + _localFulfilledAtoms;
    }

    function remainingInventoryAtoms() external view returns (uint256) {
        return maxInventoryAtoms - totalFulfilledAtoms();
    }

    function isFulfilled(bytes32 paymentDeliveryId) public view override returns (bool) {
        if (_fulfillments[paymentDeliveryId].fulfilled) return true;
        return address(predecessor) != address(0) && predecessor.isFulfilled(paymentDeliveryId);
    }

    function getFulfillment(bytes32 paymentDeliveryId)
        external
        view
        override
        returns (bool fulfilled, address recipient, uint256 amountAtoms, uint256 fulfilledAtBlock)
    {
        Fulfillment storage local = _fulfillments[paymentDeliveryId];
        if (local.fulfilled) {
            return (true, local.recipient, local.amountAtoms, local.fulfilledAtBlock);
        }
        if (address(predecessor) != address(0)) {
            return predecessor.getFulfillment(paymentDeliveryId);
        }
        return (false, address(0), 0, 0);
    }

    function fulfill(bytes32 paymentDeliveryId, address recipient, uint256 amountAtoms) external {
        if (msg.sender != fulfiller) revert NotFulfiller();
        if (paymentDeliveryId == bytes32(0)) revert ZeroPaymentDeliveryId();
        if (recipient == address(0)) revert ZeroAddress();
        if (amountAtoms == 0) revert InvalidAmount();
        if (isFulfilled(paymentDeliveryId)) revert AlreadyFulfilled(paymentDeliveryId);

        uint256 alreadyFulfilled = totalFulfilledAtoms();
        if (amountAtoms > maxInventoryAtoms - alreadyFulfilled) {
            revert InventoryExceeded();
        }

        _fulfillments[paymentDeliveryId] = Fulfillment({
            fulfilled: true,
            recipient: recipient,
            amountAtoms: amountAtoms,
            fulfilledAtBlock: block.number
        });
        _localFulfilledAtoms += amountAtoms;

        bool transferred = token.transfer(recipient, amountAtoms);
        if (!transferred) revert TokenTransferFailed();

        emit Fulfilled(paymentDeliveryId, recipient, amountAtoms, block.number);
    }
}
