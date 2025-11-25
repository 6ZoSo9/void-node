// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IVoidTokenLike} from "./IVoidTokenLike.sol";

/// @title OpsTreasury
/// @notice Hotter treasury used for real spending (ops, grants, vendors).
/// @dev This is where real-world spend happens. It still uses a strict admin
///      and emits events so off-chain accounting / AI agents can track flows.
contract OpsTreasury {
    IVoidTokenLike public immutable token;

    address public admin;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event Spent(address indexed operator, address indexed to, uint256 amount, bytes32 tag);

    error NotAdmin();
    error ZeroAddress();
    error TransferFailed();

    constructor(IVoidTokenLike _token, address _admin) {
        if (address(_token) == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();
        token = _token;
        admin = _admin;
        emit AdminChanged(address(0), _admin);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @notice Change the admin key for OpsTreasury.
    function changeAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice Spend tokens from OpsTreasury to a recipient.
    /// @param to     Recipient address (can be EOA, contract, another treasury).
    /// @param amount Amount of $VOID to send.
    /// @param tag    Opaque application tag (e.g. expense category / proposal id).
    function spend(address to, uint256 amount, bytes32 tag) external onlyAdmin {
        if (to == address(0)) revert ZeroAddress();
        bool ok = token.transfer(to, amount);
        if (!ok) revert TransferFailed();
        emit Spent(msg.sender, to, amount, tag);
    }
}
