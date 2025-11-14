# VOID Network – ReceiptRegistry Contract Spec (v1, minimal)

ReceiptRegistry is a simple on-chain log of job receipts for VOID.

It links:
- jobId (from JobQueue),
- agentId (from AgentRegistry),
- modelId (from ModelRegistry),
- datasetId (from DatasetRegistry),
- result and proof hashes,
- optional metadata.

It does not enforce correctness; it is a durable ledger that off-chain infra reads.

Responsibilities:
- Let anyone record a receipt for a job.
- Assign a stable receiptId (1-based).
- Track submitter, createdAt, and status.
- Let the original submitter update the receipt (better proof or metadata).

Non-responsibilities:
- Verifying AI outputs.
- Enforcing that referenced ids exist in other registries.
- Gating writes behind MasterKey governance.

Trust and quality are handled off-chain by agents, models, policies, and monitoring.
