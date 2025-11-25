// SPDX-License-Identifier: VCL-1.0
pragma solidity 0.8.20;

/// @notice Minimal interface to JobQueue needed by JobReceipts.
interface IJobQueue {
    function nextJobId() external view returns (uint256);
}

/// @notice Minimal interface to AgentRegistry needed by JobReceipts.
interface IAgentRegistry {
    function isAgentActive(string calldata agentId) external view returns (bool);
    function getAgentRuntime(string calldata agentId) external view returns (address);
}

/// @title JobReceipts (v1, minimal)
/// @notice Records which agent handled which job, with minimal receipt/output hashes.
/// - Does NOT enforce payment or staking.
/// - Does NOT create jobs; only references JobQueue.
/// - Uses AgentRegistry to bind job handling to a registered runtime address.
contract JobReceipts {
    /// @dev Status codes:
    /// 0 = None (no record)
    /// 1 = Claimed
    /// 2 = Completed
    /// 3 = Failed
    /// 4 = Cancelled (admin)
    struct Receipt {
        bool exists;
        string agentId;
        address agentRuntime;
        uint8 status;
        bytes32 receiptHash;
        bytes32 outputHash;
        string metadata;
        uint64 claimedAt;
        uint64 completedAt;
    }

    address public admin;
    IJobQueue public jobQueue;
    IAgentRegistry public agentRegistry;

    mapping(uint256 => Receipt) private receipts;

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event AdminChanged(address oldAdmin, address newAdmin);

    event JobClaimed(uint256 jobId, string agentId, address agentRuntime, uint64 claimedAt);

    event JobCompleted(
        uint256 jobId,
        string agentId,
        address agentRuntime,
        uint8 status, // 2 = Completed, 3 = Failed
        bytes32 receiptHash,
        bytes32 outputHash,
        string metadata,
        uint64 completedAt
    );

    event JobCancelled(uint256 jobId, string agentId, address agentRuntime, uint8 oldStatus, uint8 newStatus);

    // ------------------------------------------------------------------------
    // Modifiers / ctor
    // ------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "JobReceipts: not admin");
        _;
    }

    constructor(address _admin, address _jobQueue, address _agentRegistry) {
        require(_admin != address(0), "JobReceipts: admin zero");
        require(_jobQueue != address(0), "JobReceipts: jobQueue zero");
        require(_agentRegistry != address(0), "JobReceipts: agentRegistry zero");

        admin = _admin;
        jobQueue = IJobQueue(_jobQueue);
        agentRegistry = IAgentRegistry(_agentRegistry);

        emit AdminChanged(address(0), _admin);
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "JobReceipts: admin zero");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    function setJobQueue(address _jobQueue) external onlyAdmin {
        require(_jobQueue != address(0), "JobReceipts: jobQueue zero");
        jobQueue = IJobQueue(_jobQueue);
    }

    function setAgentRegistry(address _agentRegistry) external onlyAdmin {
        require(_agentRegistry != address(0), "JobReceipts: agentRegistry zero");
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    // ------------------------------------------------------------------------
    // Core functions
    // ------------------------------------------------------------------------

    /// @notice Claim a job for a given agent.
    /// @dev In v1, you can only claim once per jobId (no re-claims).
    function claimJob(uint256 jobId, string calldata agentId) external {
        // Basic sanity: job must exist in JobQueue.
        uint256 nextId = jobQueue.nextJobId();
        require(jobId > 0 && jobId < nextId, "JobReceipts: invalid jobId");

        Receipt storage r = receipts[jobId];
        require(!r.exists, "JobReceipts: already claimed");

        // Agent must be active and runtime must match msg.sender.
        require(agentRegistry.isAgentActive(agentId), "JobReceipts: agent not active");
        address runtime = agentRegistry.getAgentRuntime(agentId);
        require(runtime == msg.sender, "JobReceipts: bad runtime");

        r.exists = true;
        r.agentId = agentId;
        r.agentRuntime = runtime;
        r.status = 1; // Claimed
        uint64 ts = uint64(block.timestamp);
        r.claimedAt = ts;
        r.completedAt = 0;

        emit JobClaimed(jobId, agentId, runtime, ts);
    }

    /// @notice Complete a job with a final status and receipt/output hashes.
    /// @param jobId The job identifier (from JobQueue).
    /// @param statusCode 2 = Completed, 3 = Failed.
    /// @param receiptHash Hash of off-chain receipt document.
    /// @param outputHash Hash of primary output or bundle.
    /// @param metadata Small JSON metadata string.
    function completeJob(
        uint256 jobId,
        uint8 statusCode,
        bytes32 receiptHash,
        bytes32 outputHash,
        string calldata metadata
    ) external {
        require(statusCode == 2 || statusCode == 3, "JobReceipts: bad status");

        Receipt storage r = receipts[jobId];
        require(r.exists, "JobReceipts: no record");
        require(r.status == 1, "JobReceipts: not claimed");
        require(msg.sender == r.agentRuntime, "JobReceipts: not runtime");

        r.status = statusCode;
        r.receiptHash = receiptHash;
        r.outputHash = outputHash;
        r.metadata = metadata;
        uint64 ts = uint64(block.timestamp);
        r.completedAt = ts;

        emit JobCompleted(jobId, r.agentId, r.agentRuntime, statusCode, receiptHash, outputHash, metadata, ts);
    }

    /// @notice Admin-only cancel of a job's receipt record.
    function adminCancelJob(uint256 jobId) external onlyAdmin {
        Receipt storage r = receipts[jobId];
        require(r.exists, "JobReceipts: no record");
        uint8 oldStatus = r.status;
        if (oldStatus == 4) {
            return; // already cancelled
        }
        r.status = 4; // Cancelled
        emit JobCancelled(jobId, r.agentId, r.agentRuntime, oldStatus, 4);
    }

    // ------------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------------

    function hasReceipt(uint256 jobId) external view returns (bool) {
        return receipts[jobId].exists;
    }

    function getStatus(uint256 jobId) external view returns (uint8) {
        Receipt storage r = receipts[jobId];
        if (!r.exists) {
            return 0;
        }
        return r.status;
    }

    function getReceipt(uint256 jobId)
        external
        view
        returns (
            string memory agentId,
            address agentRuntime,
            uint8 status,
            bytes32 receiptHash,
            bytes32 outputHash,
            string memory metadata,
            uint64 claimedAt,
            uint64 completedAt
        )
    {
        Receipt storage r = receipts[jobId];
        require(r.exists, "JobReceipts: no record");

        return
            (r.agentId, r.agentRuntime, r.status, r.receiptHash, r.outputHash, r.metadata, r.claimedAt, r.completedAt);
    }
}
