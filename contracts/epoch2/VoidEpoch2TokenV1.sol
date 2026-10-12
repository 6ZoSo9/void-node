// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Epoch-2 canonical VOID token runtime.
/// @dev Intended for fixed-address genesis predeployment at
///      0x470075B85352Eb86F7d089FB9ba88945f12AAd94.
///      Genesis imports the reconciled frozen totalSupply/balanceOf state
///      directly; no migration mint or live token transfer is required.
///
/// Storage layout is deliberately minimal and explicit:
///   slot 0: totalSupply
///   slot 1: balanceOf mapping root
///   slot 2: allowance nested mapping root
///
/// The owner is runtime-bound, matching the observed epoch-1 authority shape:
/// owner() is not backed by mutable storage and there is no ownership-transfer
/// surface.
contract VoidEpoch2TokenV1 {
    string public constant name = "VoidStones";
    string public constant symbol = "VOID";
    uint8 public constant decimals = 18;

    uint256 public constant PREMINE = 333_333_333 ether;
    uint256 public constant MAX_SUPPLY = 666_666_666 ether;

    address public constant owner =
        0x54ded2DAA618a257093556A5F54c43805b9BD516;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed tokenOwner,
        address indexed spender,
        uint256 value
    );

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "VoidToken: approve to zero");

        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(
            currentAllowance >= amount,
            "VoidToken: allowance exceeded"
        );

        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        emit Approval(from, msg.sender, currentAllowance - amount);

        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external returns (bool) {
        require(msg.sender == owner, "VoidToken: not owner");
        require(to != address(0), "VoidToken: mint to zero");
        require(amount <= MAX_SUPPLY - totalSupply, "VoidToken: cap exceeded");

        totalSupply += amount;
        balanceOf[to] += amount;

        emit Transfer(address(0), to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "VoidToken: transfer to zero");

        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "VoidToken: balance too low");

        unchecked {
            balanceOf[from] = fromBalance - amount;
        }
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }
}
