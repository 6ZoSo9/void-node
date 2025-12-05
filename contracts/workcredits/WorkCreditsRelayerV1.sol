// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./WorkCreditsRelayerTypes.sol";

interface IWC20 {
    function balanceOf(address) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title WorkCreditsRelayerV1
/// @notice Meta-tx executor for WC-funded relayed calls.
/// @dev This contract does NOT talk to the LLP directly. The LLP math is done off-chain
///      (or via the quote helper); this contract enforces signature, nonce, deadline,
///      and that wcFee <= maxWCFee, and collects WC from the user.
contract WorkCreditsRelayerV1 {
    using WorkCreditsRelayerTypes for WorkCreditsRelayerTypes.RelayedCall;

    error NotAdmin();
    error InvalidSignature();
    error InvalidSignatureS();
    error DeadlineExpired();
    error NonceMismatch();
    error FeeTooHigh();
    error TargetCallFailed();
    error NonZeroValueUnsupported();

    uint256 private constant SECP256K1_N_DIV_2 =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    address public admin;
    address public feeRecipient;
    IWC20 public immutable wcToken;

    mapping(address => uint256) public nonces;

    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event RelayedExecuted(
        address indexed user,
        address indexed relayerCaller,
        address indexed to,
        uint256 wcFee,
        uint256 nonce
    );

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _admin, address _wcToken, address _feeRecipient) {
        require(_admin != address(0), "admin=0");
        require(_wcToken != address(0), "wcToken=0");
        require(_feeRecipient != address(0), "feeRecipient=0");
        admin = _admin;
        wcToken = IWC20(_wcToken);
        feeRecipient = _feeRecipient;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "newAdmin=0");
        address old = admin;
        admin = newAdmin;
        emit AdminUpdated(old, newAdmin);
    }

    function setFeeRecipient(address newRecipient) external onlyAdmin {
        require(newRecipient != address(0), "newRecipient=0");
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    /// @notice Execute a relayed call on behalf of `c.user`, charging them `wcFee` WC.
    /// @param c       The RelayedCall meta-tx struct (user, to, data, value, nonce, maxWCFee, deadline).
    /// @param sig     User's EIP-712 signature over this call (r||s||v).
    /// @param wcFee   WC fee to charge; must be <= c.maxWCFee. Computed off-chain using LLP math.
    function executeRelayedCall(
        WorkCreditsRelayerTypes.RelayedCall memory c,
        bytes memory sig,
        uint256 wcFee
    ) external {
        if (c.value != 0) {
            // For now we only support value=0; VOID forwarding can be added later.
            revert NonZeroValueUnsupported();
        }

        if (block.timestamp > c.deadline) revert DeadlineExpired();

        uint256 expectedNonce = nonces[c.user];
        if (c.nonce != expectedNonce) revert NonceMismatch();

        // Recover signer
        bytes32 d = WorkCreditsRelayerTypes.digest(block.chainid, address(this), c);
        address signer = _recover(d, sig);
        if (signer != c.user) revert InvalidSignature();

        if (wcFee > c.maxWCFee) revert FeeTooHigh();

        // Charge WC fee to feeRecipient
        if (!wcToken.transferFrom(c.user, feeRecipient, wcFee)) {
            revert TargetCallFailed();
        }

        // Bump nonce before external call
        nonces[c.user] = expectedNonce + 1;

        // Execute target call
        (bool ok, ) = c.to.call(c.data);
        if (!ok) {
            revert TargetCallFailed();
        }

        emit RelayedExecuted(c.user, msg.sender, c.to, wcFee, expectedNonce);
    }

    function _recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) revert InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;
        // sig layout: r (32) | s (32) | v (1)
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidSignature();
        if (uint256(s) > SECP256K1_N_DIV_2) revert InvalidSignatureS();

        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
        return recovered;
    }
}
