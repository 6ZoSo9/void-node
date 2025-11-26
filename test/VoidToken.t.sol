// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/VoidToken.sol";

/// @notice Minimal smoke tests for VOID ERC20 (VoidStones).
/// @dev No forge-std; just bare require() checks.
contract VoidTokenTest {
    VoidToken private token;
    address private premineRecipient = address(this);

    constructor() {
        // Test contract is deployer/owner; premine goes to this contract.
        token = new VoidToken(premineRecipient);
    }

    function testConstantsAndPremine() public {
        uint256 maxSupply = token.MAX_SUPPLY();
        uint256 premine = token.PREMINE();

        require(maxSupply == 666_666_666 * 1e18, "MAX_SUPPLY mismatch");
        require(premine == 333_333_333 * 1e18, "PREMINE mismatch");

        require(token.totalSupply() == premine, "totalSupply != PREMINE");
        require(token.balanceOf(premineRecipient) == premine, "premine not minted to recipient");
    }

    function testTransferKeepsSupplyInvariant() public {
        uint256 beforeSupply = token.totalSupply();
        uint256 amount = 1e18;
        address to = address(0xBEEF);

        bool ok = token.transfer(to, amount);
        require(ok, "transfer failed");
        require(token.balanceOf(to) == amount, "to balance mismatch");
        require(token.balanceOf(premineRecipient) + token.balanceOf(to) == beforeSupply, "supply invariant broken");
        require(token.totalSupply() == beforeSupply, "totalSupply changed on transfer");
    }

    function testOwnerCanMintUpToCap() public {
        uint256 premine = token.PREMINE();
        uint256 maxSupply = token.MAX_SUPPLY();
        uint256 remaining = maxSupply - premine;

        // Mint a couple of chunks but stay well below cap to keep this a pure smoke test.
        uint256 chunk = remaining / 10;

        bool ok1 = token.mint(address(0xCAFE), chunk);
        bool ok2 = token.mint(address(0xCAFE), chunk);
        require(ok1 && ok2, "mint failed");

        uint256 expected = premine + 2 * chunk;
        require(token.totalSupply() == expected, "totalSupply after mint mismatch");
        require(token.balanceOf(address(0xCAFE)) == 2 * chunk, "minted balance mismatch");
    }
}
