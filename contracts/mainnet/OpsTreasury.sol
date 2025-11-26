// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IVoidTokenLike} from "./IVoidTokenLike.sol";

/// @title OpsTreasury
/// @notice Hot operational treasury that can only be spent by the admin.
///         It holds VOID (or any IVoidTokenLike) and pushes funds out to
///         vendors / ops destinations with a bytes32 tag for bookkeeping.
contract OpsTreasury {
    error NotAdmin();

    IVoidTokenLike public immutable token;
    address public immutable admin;

    event Spend(address indexed to, uint256 amount, bytes32 indexed tag);

    constructor(IVoidTokenLike _token, address _admin) {
        token = _token;
        admin = _admin;
    }

    /// @notice Spend `amount` tokens to `to` with a `tag` for off-chain tracking.
    /// @dev Only `admin` may call. Reverts on failed transfer.
    function spend(address to, uint256 amount, bytes32 tag) external {
        if (msg.sender != admin) revert NotAdmin();

        bool ok = token.transfer(to, amount);
        require(ok, "OpsTreasury: transfer failed");

        emit Spend(to, amount, tag);
    }
}
