// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

/// @title ModelEvalRegistry v1 (minimal)
/// @notice Records evaluation results for models in ModelRegistry.
contract ModelEvalRegistry {
    struct EvalRecord {
        int256 overallScore;
        bytes32 metricsHash;
        string metadata;
        address submitter;
        uint64 recordedAt;
        bool active;
    }

    // modelId => version => evalSuiteId => record
    mapping(string => mapping(uint64 => mapping(string => EvalRecord))) private evals;
    mapping(string => mapping(uint64 => mapping(string => bool))) public isRecorded;

    address public admin;

    event EvalRecorded(
        string modelId, uint64 version, string evalSuiteId, int256 overallScore, bytes32 metricsHash, address submitter
    );

    event EvalActivationChanged(string modelId, uint64 version, string evalSuiteId, bool active);

    modifier onlyAdmin() {
        require(msg.sender == admin, "ModelEvalRegistry: not admin");
        _;
    }

    constructor(address _admin) {
        admin = _admin;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "ModelEvalRegistry: zero admin");
        admin = newAdmin;
    }

    // -------- Views --------

    function getEval(string memory modelId, uint64 version, string memory evalSuiteId)
        external
        view
        returns (
            int256 overallScore,
            bytes32 metricsHash,
            string memory metadata,
            address submitter,
            uint64 recordedAt,
            bool active
        )
    {
        EvalRecord storage r = evals[modelId][version][evalSuiteId];
        return (r.overallScore, r.metricsHash, r.metadata, r.submitter, r.recordedAt, r.active);
    }

    function isEvalActive(string memory modelId, uint64 version, string memory evalSuiteId)
        external
        view
        returns (bool)
    {
        return evals[modelId][version][evalSuiteId].active;
    }

    // -------- Core functions --------

    /// @notice Record or update an eval for (modelId, version, evalSuiteId).
    function recordEval(
        string memory modelId,
        uint64 version,
        string memory evalSuiteId,
        int256 overallScore,
        bytes32 metricsHash,
        string memory metadata
    ) external onlyAdmin {
        require(bytes(modelId).length != 0, "ModelEvalRegistry: empty modelId");
        require(version != 0, "ModelEvalRegistry: bad version");
        require(bytes(evalSuiteId).length != 0, "ModelEvalRegistry: empty suite");

        EvalRecord storage r = evals[modelId][version][evalSuiteId];
        r.overallScore = overallScore;
        r.metricsHash = metricsHash;
        r.metadata = metadata;
        r.submitter = msg.sender;
        r.recordedAt = uint64(block.timestamp);
        r.active = true;

        isRecorded[modelId][version][evalSuiteId] = true;

        emit EvalRecorded(modelId, version, evalSuiteId, overallScore, metricsHash, msg.sender);
    }

    /// @notice Set active flag for an eval record.
    function setEvalActive(string memory modelId, uint64 version, string memory evalSuiteId, bool active_)
        external
        onlyAdmin
    {
        require(isRecorded[modelId][version][evalSuiteId], "ModelEvalRegistry: not recorded");

        EvalRecord storage r = evals[modelId][version][evalSuiteId];
        r.active = active_;

        emit EvalActivationChanged(modelId, version, evalSuiteId, active_);
    }
}
