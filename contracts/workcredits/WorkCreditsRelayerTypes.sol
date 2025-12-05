// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WorkCreditsRelayerTypes
/// @notice EIP-712 types and hashing helpers for relayed WC-funded calls.
library WorkCreditsRelayerTypes {
    // EIP-712 domain: we will use this pattern in the actual relayer contract.
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        0xd87cd6f3c0cfb9dc6d59f96f94c3ee6906661b46b887b8b7bf9ccfddda5b6e44;

    // keccak256("RelayedCall(address user,address to,bytes data,uint256 value,uint256 nonce,uint256 maxWCFee,uint256 deadline)")
    bytes32 internal constant RELAYED_CALL_TYPEHASH =
        0x598db1cdcafe1e2b370f8b8a5b1287de5b20c7a2b06caedde4370b0d9a6dafa5;

    struct RelayedCall {
        address user;      // original user
        address to;        // target contract
        bytes   data;      // calldata for target
        uint256 value;     // native VOID value to forward (usually 0 for now)
        uint256 nonce;     // per-user replay guard
        uint256 maxWCFee;  // user-approved max WC fee for this call
        uint256 deadline;  // unix timestamp after which this call is invalid
    }

    /// @notice Compute the EIP-712 domain separator for a given relayer contract.
    /// @dev name/version are hard-coded to keep things simple and consistent.
    function domainSeparator(uint256 chainId, address verifyingContract)
        internal
        pure
        returns (bytes32)
    {
        bytes32 nameHash    = keccak256(bytes("VoidWorkCreditsRelayer"));
        bytes32 versionHash = keccak256(bytes("1"));
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                nameHash,
                versionHash,
                chainId,
                verifyingContract
            )
        );
    }

    /// @notice Compute the struct hash for a given RelayedCall.
    function hashRelayedCall(RelayedCall memory c) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                RELAYED_CALL_TYPEHASH,
                c.user,
                c.to,
                keccak256(c.data),
                c.value,
                c.nonce,
                c.maxWCFee,
                c.deadline
            )
        );
    }

    /// @notice Compute the typed-data digest that should be signed by the user.
    function digest(
        uint256 chainId,
        address verifyingContract,
        RelayedCall memory c
    ) internal pure returns (bytes32) {
        bytes32 ds = domainSeparator(chainId, verifyingContract);
        bytes32 hc = hashRelayedCall(c);
        return keccak256(abi.encodePacked("\x19\x01", ds, hc));
    }
}
