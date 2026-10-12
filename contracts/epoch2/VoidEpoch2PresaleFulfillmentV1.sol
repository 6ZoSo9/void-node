// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVoidEpoch2PresaleTokenV1 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract VoidEpoch2PresaleFulfillmentV1 {
    error NotFulfiller();
    error ZeroAddress();
    error ZeroPaymentDeliveryId();
    error InvalidAmount();
    error AlreadyFulfilled(bytes32 paymentDeliveryId);
    error InventoryExceeded();
    error TokenTransferFailed();

    struct Fulfillment {
        bool fulfilled;
        address recipient;
        uint256 amountAtoms;
        uint256 fulfilledAtBlock;
    }

    address public constant voidToken =
        0x470075B85352Eb86F7d089FB9ba88945f12AAd94;
    address public constant fulfiller =
        0x0F0B8Aa14e1c9764fa8E4FA8b38fd3D3b8C2498A;
    uint256 public constant executionEpoch = 2;
    uint256 public constant maxInventoryAtoms = 10_000_000 ether;

    mapping(bytes32 => Fulfillment) private _fulfillments;
    uint256 private _totalFulfilledAtoms;

    event Fulfilled(
        bytes32 indexed paymentDeliveryId,
        address indexed recipient,
        uint256 amountAtoms,
        uint256 fulfilledAtBlock
    );

    function totalFulfilledAtoms() external view returns (uint256) {
        return _totalFulfilledAtoms;
    }

    function remainingInventoryAtoms() external view returns (uint256) {
        return maxInventoryAtoms - _totalFulfilledAtoms;
    }

    function isFulfilled(bytes32 paymentDeliveryId) external view returns (bool) {
        return _fulfillments[paymentDeliveryId].fulfilled;
    }

    function getFulfillment(bytes32 paymentDeliveryId)
        external
        view
        returns (
            bool fulfilled,
            address recipient,
            uint256 amountAtoms,
            uint256 fulfilledAtBlock
        )
    {
        Fulfillment storage item = _fulfillments[paymentDeliveryId];
        return (
            item.fulfilled,
            item.recipient,
            item.amountAtoms,
            item.fulfilledAtBlock
        );
    }

    function fulfill(
        bytes32 paymentDeliveryId,
        address recipient,
        uint256 amountAtoms
    ) external {
        if (msg.sender != fulfiller) revert NotFulfiller();
        if (paymentDeliveryId == bytes32(0)) revert ZeroPaymentDeliveryId();
        if (recipient == address(0)) revert ZeroAddress();
        if (amountAtoms == 0) revert InvalidAmount();
        if (_fulfillments[paymentDeliveryId].fulfilled) {
            revert AlreadyFulfilled(paymentDeliveryId);
        }
        if (amountAtoms > maxInventoryAtoms - _totalFulfilledAtoms) {
            revert InventoryExceeded();
        }

        _fulfillments[paymentDeliveryId] = Fulfillment({
            fulfilled: true,
            recipient: recipient,
            amountAtoms: amountAtoms,
            fulfilledAtBlock: block.number
        });
        _totalFulfilledAtoms += amountAtoms;

        bool ok =
            IVoidEpoch2PresaleTokenV1(voidToken).transfer(recipient, amountAtoms);
        if (!ok) revert TokenTransferFailed();

        emit Fulfilled(
            paymentDeliveryId,
            recipient,
            amountAtoms,
            block.number
        );
    }
}
