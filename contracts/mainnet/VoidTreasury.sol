// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IVoidTokenLike} from "./IVoidTokenLike.sol";
import {OpsTreasury} from "./OpsTreasury.sol";

/// @title VoidTreasury
/// @notice Cold treasury holding premine funds. Only the admin can move
///         funds from here into the OpsTreasury (hot wallet).
contract VoidTreasury {
    error NotAdmin();

    IVoidTokenLike public immutable token;
    OpsTreasury public immutable opsTreasury;
    address public immutable admin;

    event SendToOps(uint256 amount, bytes32 indexed tag);

    constructor(
        IVoidTokenLike _token,
        address _opsTreasury,
        address _admin
    ) {
        token = _token;
        opsTreasury = OpsTreasury(_opsTreasury);
        admin = _admin;
    }

    /// @notice Move `amount` tokens from the cold treasury into OpsTreasury.
    /// @dev Only `admin` may call. Reverts on failed transfer.
    function sendToOps(uint256 amount, bytes32 tag) external {
        if (msg.sender != admin) revert NotAdmin();

        bool ok = token.transfer(address(opsTreasury), amount);
        require(ok, "VoidTreasury: transfer failed");

        emit SendToOps(amount, tag);
    }
}
