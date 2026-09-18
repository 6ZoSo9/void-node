// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDatanetContentCommitmentRegistryV1 {
    function registryVersion() external view returns (uint256);
    function maxObjectBytes() external view returns (uint64);
    function isCommitted(bytes32 objectIdSha256) external view returns (bool);
    function getCommitment(bytes32 objectIdSha256)
        external
        view
        returns (
            bool committed,
            bytes32 contentSha256,
            uint64 byteLength,
            uint256 committedAtBlock
        );
}

contract DatanetContentCommitmentRegistryV1 is IDatanetContentCommitmentRegistryV1 {
    error ZeroAddress();
    error NotPublisher();
    error ZeroObjectId();
    error ZeroContentDigest();
    error InvalidByteLength();
    error AlreadyCommitted(bytes32 objectIdSha256);
    error PredecessorMismatch();

    uint64 internal constant _MAX_OBJECT_BYTES = 268_435_456;

    struct Commitment {
        bool committed;
        bytes32 contentSha256;
        uint64 byteLength;
        uint256 committedAtBlock;
    }

    address public immutable publisher;
    IDatanetContentCommitmentRegistryV1 public immutable predecessor;

    mapping(bytes32 => Commitment) internal _commitments;

    event ContentCommitted(
        bytes32 indexed objectIdSha256,
        bytes32 indexed contentSha256,
        uint64 byteLength,
        uint256 committedAtBlock
    );

    constructor(address publisher_, address predecessor_) {
        if (publisher_ == address(0)) revert ZeroAddress();
        publisher = publisher_;
        predecessor = IDatanetContentCommitmentRegistryV1(predecessor_);

        if (predecessor_ != address(0)) {
            if (
                predecessor.registryVersion() != 1 ||
                predecessor.maxObjectBytes() != _MAX_OBJECT_BYTES
            ) {
                revert PredecessorMismatch();
            }
        }
    }

    function registryVersion() external pure override returns (uint256) {
        return 1;
    }

    function maxObjectBytes() external pure override returns (uint64) {
        return _MAX_OBJECT_BYTES;
    }

    function isCommitted(bytes32 objectIdSha256) public view override returns (bool) {
        if (_commitments[objectIdSha256].committed) return true;
        return address(predecessor) != address(0) && predecessor.isCommitted(objectIdSha256);
    }

    function getCommitment(bytes32 objectIdSha256)
        external
        view
        override
        returns (
            bool committed,
            bytes32 contentSha256,
            uint64 byteLength,
            uint256 committedAtBlock
        )
    {
        Commitment storage local = _commitments[objectIdSha256];
        if (local.committed) {
            return (
                true,
                local.contentSha256,
                local.byteLength,
                local.committedAtBlock
            );
        }
        if (address(predecessor) != address(0)) {
            return predecessor.getCommitment(objectIdSha256);
        }
        return (false, bytes32(0), 0, 0);
    }

    function commit(
        bytes32 objectIdSha256,
        bytes32 contentSha256,
        uint64 byteLength
    ) external {
        if (msg.sender != publisher) revert NotPublisher();
        if (objectIdSha256 == bytes32(0)) revert ZeroObjectId();
        if (contentSha256 == bytes32(0)) revert ZeroContentDigest();
        if (byteLength == 0 || byteLength > _MAX_OBJECT_BYTES) {
            revert InvalidByteLength();
        }
        if (isCommitted(objectIdSha256)) {
            revert AlreadyCommitted(objectIdSha256);
        }

        _commitments[objectIdSha256] = Commitment({
            committed: true,
            contentSha256: contentSha256,
            byteLength: byteLength,
            committedAtBlock: block.number
        });

        emit ContentCommitted(
            objectIdSha256,
            contentSha256,
            byteLength,
            block.number
        );
    }
}
