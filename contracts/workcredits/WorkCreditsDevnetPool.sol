// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal ERC20 interface for devnet pool.
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @dev Devnet-only stub pool for VOID/WC reserves.
/// - Owner seeds liquidity once (or a few times)
/// - Reserves are tracked in storage so off-chain can read them cheaply.
/// - No swaps or LP accounting yet: this is for metrics / pricing / UI bootstrapping only.
contract WorkCreditsDevnetPool {
    address public immutable voidToken;
    address public immutable workCreditsToken;
    address public owner;

    uint256 public reserveVOID;
    uint256 public reserveWC;

    event Seed(address indexed from, uint256 amountVOID, uint256 amountWC);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "WorkCreditsDevnetPool: only owner");
        _;
    }

    constructor(address _voidToken, address _workCreditsToken) {
        require(_voidToken != address(0), "WorkCreditsDevnetPool: void token zero");
        require(_workCreditsToken != address(0), "WorkCreditsDevnetPool: wc token zero");
        voidToken = _voidToken;
        workCreditsToken = _workCreditsToken;
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "WorkCreditsDevnetPool: new owner zero");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /// @dev Seed the pool with initial VOID/WC reserves.
    /// Caller must have approved this contract for both tokens.
    function seed(uint256 amountVOID, uint256 amountWC) external onlyOwner {
        require(amountVOID > 0, "WorkCreditsDevnetPool: amountVOID=0");
        require(amountWC > 0, "WorkCreditsDevnetPool: amountWC=0");

        bool ok1 = IERC20Minimal(voidToken).transferFrom(msg.sender, address(this), amountVOID);
        require(ok1, "WorkCreditsDevnetPool: VOID transfer failed");

        bool ok2 = IERC20Minimal(workCreditsToken).transferFrom(msg.sender, address(this), amountWC);
        require(ok2, "WorkCreditsDevnetPool: WC transfer failed");

        reserveVOID += amountVOID;
        reserveWC += amountWC;

        emit Seed(msg.sender, amountVOID, amountWC);
    }

    /// @dev Reserves view for off-chain metrics / UI.
    function getReserves() external view returns (uint256 voidReserve, uint256 wcReserve) {
        return (reserveVOID, reserveWC);
    }
}
