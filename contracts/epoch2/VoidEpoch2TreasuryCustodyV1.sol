// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVoidEpoch2TreasuryTokenV1 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract VoidEpoch2TreasuryCustodyV1 {
    error NotAuthority();
    error ZeroAddress();
    error ZeroActionId();
    error InvalidAmount();
    error ActionAlreadyExecuted(bytes32 actionId);
    error TokenTransferFailed();

    address public constant voidToken =
        0x470075b85352eb86f7d089fb9ba88945f12aad94;
    address public constant authority =
        0x54ded2daa618a257093556a5f54c43805b9bd516;
    uint256 public constant executionEpoch = 2;

    mapping(bytes32 => bool) public executed;

    event Released(
        bytes32 indexed actionId,
        address indexed recipient,
        uint256 amountAtoms
    );

    function release(
        bytes32 actionId,
        address recipient,
        uint256 amountAtoms
    ) external {
        if (msg.sender != authority) revert NotAuthority();
        if (actionId == bytes32(0)) revert ZeroActionId();
        if (recipient == address(0)) revert ZeroAddress();
        if (amountAtoms == 0) revert InvalidAmount();
        if (executed[actionId]) revert ActionAlreadyExecuted(actionId);

        executed[actionId] = true;
        bool ok =
            IVoidEpoch2TreasuryTokenV1(voidToken).transfer(recipient, amountAtoms);
        if (!ok) revert TokenTransferFailed();

        emit Released(actionId, recipient, amountAtoms);
    }
}
