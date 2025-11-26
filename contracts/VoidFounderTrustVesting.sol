// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IVoidToken.sol";

/// @notice Founder Trust vesting for 230,000,000 VOID (subset of 333,333,333 premine).
/// Split into:
/// - 115M: hard cliff after 10 years (infra / R&D only).
/// - 115M: linear vest over VEST_YEARS (default 5) for personal + reinvestment.
/// Tokens are pre-loaded via PremineVault, then `initialize()` locks it in.
contract VoidFounderTrustVesting {
    IVoidToken public immutable token;
    address public beneficiary;
    address public immutable gate;

    uint64 public immutable start; // vesting start timestamp
    uint64 public immutable tenYearCliff; // start + 10 years
    uint64 public immutable vestDurationB; // linear vest span for tranche B

    bool public initialized;

    uint256 public constant TOTAL_TRUST = 230_000_000e18;
    uint256 public constant TRANCHE_A_LOCKED = 115_000_000e18; // 10-year cliff
    uint256 public constant TRANCHE_B_VEST = 115_000_000e18; // linear vest

    uint256 public claimedA;
    uint256 public claimedB;

    uint64 public constant YEAR = 365 days;

    event Initialized(address indexed caller, uint256 balance);
    event BeneficiaryChanged(address indexed oldBeneficiary, address indexed newBeneficiary);
    event Claimed(address indexed caller, address indexed to, uint256 amountA, uint256 amountB);

    modifier onlyGate() {
        require(msg.sender == gate, "Trust: NOT_GATE");
        _;
    }

    modifier onlyBeneficiaryOrGate() {
        require(msg.sender == beneficiary || msg.sender == gate, "Trust: NOT_AUTHORIZED");
        _;
    }

    constructor(IVoidToken _token, address _beneficiary, address _gate, uint64 _start, uint8 vestYearsB) {
        require(address(_token) != address(0), "Trust: token zero");
        require(_beneficiary != address(0), "Trust: beneficiary zero");
        require(_gate != address(0), "Trust: gate zero");
        require(vestYearsB > 0, "Trust: vest years");

        token = _token;
        beneficiary = _beneficiary;
        gate = _gate;

        start = _start;
        tenYearCliff = _start + 10 * YEAR;
        vestDurationB = uint64(vestYearsB) * YEAR;

        // Sanity check: split matches total
        require(TRANCHE_A_LOCKED + TRANCHE_B_VEST == TOTAL_TRUST, "Trust: bad math");
    }

    /// @notice Lock in the initial balance. Must be called after
    /// the full 230M VOID has been transferred here.
    function initialize() external onlyGate {
        require(!initialized, "Trust: already initialized");
        uint256 bal = token.balanceOf(address(this));
        require(bal == TOTAL_TRUST, "Trust: balance != 230M");
        initialized = true;
        emit Initialized(msg.sender, bal);
    }

    /// @notice Change beneficiary (e.g., to a new VOID Labs LLC multisig).
    function setBeneficiary(address newBeneficiary) external onlyGate {
        require(newBeneficiary != address(0), "Trust: beneficiary zero");
        address old = beneficiary;
        beneficiary = newBeneficiary;
        emit BeneficiaryChanged(old, newBeneficiary);
    }

    /// @notice Compute how much is currently claimable in each tranche.
    function claimable() public view returns (uint256 claimableA, uint256 claimableB) {
        if (!initialized) {
            return (0, 0);
        }

        uint256 ts = block.timestamp;

        // Tranche A: 10-year cliff, all-at-once afterwards.
        if (ts >= tenYearCliff) {
            claimableA = TRANCHE_A_LOCKED - claimedA;
        } else {
            claimableA = 0;
        }

        // Tranche B: linear vest over vestDurationB starting at `start`.
        if (ts <= start) {
            claimableB = 0;
        } else {
            uint64 elapsed = uint64(ts - start);
            if (elapsed >= vestDurationB) {
                // Fully vested
                claimableB = TRANCHE_B_VEST - claimedB;
            } else {
                uint256 vested = (TRANCHE_B_VEST * elapsed) / vestDurationB;
                if (vested <= claimedB) {
                    claimableB = 0;
                } else {
                    claimableB = vested - claimedB;
                }
            }
        }
    }

    /// @notice Claim any currently-vested tokens to `to`.
    function claim(address to) external onlyBeneficiaryOrGate {
        require(initialized, "Trust: not initialized");
        require(to != address(0), "Trust: to zero");

        (uint256 ca, uint256 cb) = claimable();
        require(ca > 0 || cb > 0, "Trust: nothing claimable");

        claimedA += ca;
        claimedB += cb;

        uint256 total = ca + cb;
        (bool ok, bytes memory data) =
            address(token).call(abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, total));

        // Accept:
        // - tokens that return no data (old style)
        // - tokens that return a single bool which must be true
        bool success = ok && (data.length == 0 || abi.decode(data, (bool)));
        require(success, "Trust: transfer failed");
        emit Claimed(msg.sender, to, ca, cb);
    }
}
