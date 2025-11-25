// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IVoidTokenLike} from "./IVoidTokenLike.sol";

/// @title VoidTreasury
/// @notice Cold / deep treasury that holds the premine.
/// @dev Intentionally minimal. The idea:
///      - This contract *only* sends $VOID to the OpsTreasury.
///      - Only the admin (later: AdminGate / UpdateGate) can trigger flows.
///      - No direct payouts to EOAs from here.
contract VoidTreasury {
    IVoidTokenLike public immutable token;
    address public immutable opsTreasury;

    address public admin;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event SentToOps(address indexed caller, uint256 amount, bytes32 tag);

    error NotAdmin();
    error ZeroAddress();
    error TransferFailed();

    constructor(IVoidTokenLike _token, address _opsTreasury, address _admin) {
        if (address(_token) == address(0)) revert ZeroAddress();
        if (_opsTreasury == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();

        token = _token;
        opsTreasury = _opsTreasury;
        admin = _admin;

        emit AdminChanged(address(0), _admin);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @notice Change the admin key for this treasury.
    /// @dev In mainnet this should probably be wired to AdminGate/UpdateGate,
    ///      not a raw EOA.
    function changeAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice Move funds from VoidTreasury to OpsTreasury.
    /// @param amount Amount of $VOID to send.
    /// @param tag    Opaque application tag (e.g. keccak of a proposal id).
    function sendToOps(uint256 amount, bytes32 tag) external onlyAdmin {
        // No allowance mechanics here; the token is held by this contract.
        bool ok = token.transfer(opsTreasury, amount);
        if (!ok) revert TransferFailed();
        emit SentToOps(msg.sender, amount, tag);
    }
}
