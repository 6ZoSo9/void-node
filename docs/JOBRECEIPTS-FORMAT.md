# VOID Network – JobReceipt JSONL Format (v1, devnet)

Each line in the receipts log is a single JSON object (JSONL).

This file is append-only. It is the off-chain truth that:
- VOID agents write to, and
- Metrics/exporters read from.

Example object (single line):

{"chainId":2050,"jobId":"0xjob1","receiptId":"0xrcpt1","status":"completed","modelId":"gpt-4.1-mini","postedBy":"0x1234...","agent":"obelisk-devnet-agent-1","blockNumber":123456,"txHash":"0xabc...","createdAt":1763309000,"completedAt":1763309050}

## Required fields (v1)

- chainId (number) – EVM chain id. For VOID devnet: 2050.
- jobId (string) – On-chain JobQueue identifier (job key / id).
- receiptId (string) – Unique id for this receipt (can be tx hash or UUID).
- status (string) – "completed", "failed", or "partial".
- modelId (string) – Logical model id (for example: "gpt-4.1-mini").
- postedBy (string) – Address that posted the job (0x…).
- agent (string) – Agent identifier (hostname, wallet, etc).

## Optional but recommended

- blockNumber (number) – Block where the receipt was written on-chain.
- txHash (string) – On-chain transaction hash for the receipt.
- createdAt (number) – Unix timestamp when job was created.
- completedAt (number) – Unix timestamp when job was completed.

## Storage and rotation

- File is newline-delimited JSON (.jsonl).
- Writer (agent) appends lines.
- Exporters never modify existing lines; they only read.
- Rotation can be handled by:
  - Moving the file to receipts.jsonl.1, receipts.jsonl.2, etc.
  - Starting a new receipts.jsonl.
  - Metrics may aggregate over current plus N rotated files later.
