// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20-style WorkCredits token for devnet.
///         No external imports, no fancy hooks. Devnet only.
contract WorkCreditsToken {
    // --- ERC20 metadata ---

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    // --- ERC20 core state ---

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // --- simple ownership for mint (devnet only) ---

    address public owner;

    // --- events ---

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // --- modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "WorkCreditsToken: caller is not the owner");
        _;
    }

    // --- constructor ---

    /// @param initialOwner receives full initial supply and becomes owner.
    constructor(address initialOwner) {
        require(initialOwner != address(0), "WorkCreditsToken: zero owner");

        name = "WorkCredits";
        symbol = "WC";

        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);

        // 1,000,000,000 WC with 18 decimals
        uint256 supply = 1_000_000_000 ether;
        totalSupply = supply;
        balanceOf[initialOwner] = supply;

        emit Transfer(address(0), initialOwner, supply);
    }

    // --- ownership management (devnet convenience) ---

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "WorkCreditsToken: new owner is zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --- ERC20 core functions ---

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "WorkCreditsToken: transfer to zero");
        uint256 fromBal = balanceOf[from];
        require(fromBal >= value, "WorkCreditsToken: balance too low");

        unchecked {
            balanceOf[from] = fromBal - value;
            balanceOf[to] += value;
        }

        emit Transfer(from, to, value);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "WorkCreditsToken: allowance too low");

        if (allowed != type(uint256).max) {
            unchecked {
                allowance[from][msg.sender] = allowed - value;
            }
        }

        _transfer(from, to, value);
        return true;
    }

    // --- devnet-only mint ---

    /// @notice Devnet helper: owner can mint more WC.
    function mint(address to, uint256 amount) external onlyOwner returns (bool) {
        require(to != address(0), "WorkCreditsToken: mint to zero");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        return true;
    }
}
