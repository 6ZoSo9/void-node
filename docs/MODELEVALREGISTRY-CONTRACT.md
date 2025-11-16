# VOID Network – ModelEvalRegistry Contract Spec (v1, minimal)

ModelEvalRegistry links models in ModelRegistry to evaluation results.

It does NOT run evals on-chain. It only records:

- Which eval suite was run (by ID)
- Which model and version were evaluated
- The scores and metrics
- Who submitted the eval (e.g. lab, agent, DAO)
- When the eval was recorded

Agents and dApps can use this to choose models based on objective metrics
instead of arbitrary names.

---

## 1. Responsibilities

ModelEvalRegistry must:

- Store eval records keyed by (modelId, modelVersion, evalSuiteId).
- Track who submitted the eval and when.
- Store a small set of standard numeric metrics plus a metadata blob.
- Emit events when evals are recorded or updated.
- Be controlled by an admin (AdminGate or similar) for who may submit evals.

ModelEvalRegistry cannot:

- Guarantee eval honesty; it only stores what is submitted.
- Enforce how metrics are used.
- Run evals or verify that an off-chain eval is correct.

Those responsibilities belong to off-chain labs, DAOs, agents, and PolicyGuard.

---

## 2. Data model

### 2.1 Types

- ModelId – string (from ModelRegistry)
- ModelVersion – uint64
- EvalSuiteId – string (e.g. "VOID_SAFETY_V1", "MMLU_V1")
- Score – int256 (for normalized overall score)
- MetricKey – string (metric name, e.g. "accuracy", "latency_ms_p50")
- MetricValue – int256 (for generic numeric values)
- Submitter – address (lab, DAO, agent)
- Metadata – string (JSON recommended)
- Timestamp – uint64 (block timestamp when recorded)

### 2.2 Storage (conceptual)

Keyed by (modelId, version, evalSuiteId):

- overallScore: int256 (normalized overall score; interpretation by convention)
- submitter: address
- recordedAt: uint64
- metricsHash: bytes32 (optional hash of full metrics blob)
- metadata: string (JSON with detailed metrics)
- active: bool

Additionally:

- isRecorded[modelId][version][evalSuiteId] -> bool

We keep v1 simple: one eval record per (modelId, version, evalSuiteId),
overwritable by admin or by the same submitter under admin policy.

---

## 3. Core functions

### 3.1 recordEval

Conceptual signature:

- recordEval(
    modelId,
    version,
    evalSuiteId,
    overallScore,
    metricsHash,
    metadata
  )

Requirements:

- modelId exists in ModelRegistry (checked off-chain or via optional hook).
- version is expected to be a valid version for that model (checked off-chain
  or via optional hook).
- Caller must be admin or an address allowed by admin policy.

Effects:

- Write or overwrite the eval record:
  - overallScore
  - metricsHash
  - metadata
  - submitter = msg.sender
  - recordedAt = current time
  - active = true
- Mark isRecorded[modelId][version][evalSuiteId] = true.
- Emit EvalRecorded event.

### 3.2 setEvalActive

- setEvalActive(modelId, version, evalSuiteId, active)

Requirements:

- Caller is admin.

Effects:

- Flip active flag.
- Emit EvalActivationChanged.

Admin can use this to withdraw or deprecate bad or outdated evals.

---

## 4. View functions (for agents)

Read-only helpers:

- getEval(
    modelId,
    version,
    evalSuiteId
  ) ->
    overallScore,
    metricsHash,
    metadata,
    submitter,
    recordedAt,
    active

- isEvalRecorded(modelId, version, evalSuiteId) -> bool

Agents will typically:

1. Resolve modelId/version from ModelRegistry.
2. Query ModelEvalRegistry for one or more evalSuiteIds.
3. Decide whether the model is acceptable based on score, metadata, policy.

Example flows:

- "Use only models where evalSuiteId = VOID_SAFETY_V1 and overallScore >= 0."
- "Prefer the model with highest score on suite VOID_RELEVANCE_V1."

---

## 5. Access control

Admin model:

- Simple admin address or AdminGate-controlled address.
- Only admin (or admin-authorized submitters in a future version) can record
  or update evals.

v1 keeps it simple:

- admin can record or overwrite evals.
- Optional pattern (off-chain enforced):
  - Admin delegates to known labs or DAOs via multisig or AdminGate.

---

## 6. Events

Conceptual event signatures:

- EvalRecorded(
    string modelId,
    uint64 version,
    string evalSuiteId,
    int256 overallScore,
    bytes32 metricsHash,
    address submitter
  )

- EvalActivationChanged(
    string modelId,
    uint64 version,
    string evalSuiteId,
    bool active
  )

Indexers and dashboards can use these events to build per-model scoreboards.

---

## 7. Integration with ModelRegistry and Agent OS

ModelRegistry:

- ModelEvalRegistry does not update or own models.
- It only references models by (modelId, version).
- Off-chain services should verify that modelId/version actually exist.

JobQueue:

- Jobs can require:
  - "Use models where EvalSuiteId X has overallScore >= threshold."
- This is enforced by agents or PolicyGuard, not by ModelEvalRegistry itself.

Agent OS:

- Agents can choose models based on evals instead of just names.
- PolicyGuard can combine policy tags + eval scores to decide what is allowed.

This contract is intentionally minimal. Future versions may add:

- Multiple named metrics stored on-chain instead of a single overall score.
- Per-suite metadata about what the score means.
- On-chain voting or attestation systems for eval trust.
